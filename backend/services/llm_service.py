"""
StudyMate AI — LLM Service
Supports Groq (default), Google Gemini, and OpenAI.
Uses a strong system prompt + high max_tokens so answers are never cut off.
Map-Reduce handles 100+ page documents.
"""

import os
import json
import re
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

_LLM_PROVIDER       = os.getenv("LLM_PROVIDER", "groq").lower()
_SECTION_SIZE       = 14_000  # chars per section in map-reduce
_LONG_DOC_THRESHOLD = 50_000  # docs above this use map-reduce
_MAP_WORKERS        = 3       # parallel section workers

# ── System persona injected into every answer call ────────────────────────────
_SYSTEM_PROMPT = """You are StudyMate AI — an expert study tutor that explains concepts the way the best teachers in the world do: clearly, deeply, and with real examples.

YOUR STYLE — match this in every response:
• Write like a brilliant professor who genuinely wants the student to understand, not just memorize.
• Use plain English first, then introduce technical terms with clear definitions.
• Always include real-world examples, analogies, and comparisons to things students already know.
• Break complex ideas into numbered steps or logical stages.
• Use markdown formatting: ## for major topics, ### for subtopics, **bold** for key terms, bullet lists for properties/types/advantages.
• After the main explanation, always add a "## Key Takeaways" section — a tight bullet list of what the student must remember for the exam.

HOW TO EXPLAIN — follow this pattern for every concept:
1. **Simple definition** — what is it in one sentence a 10-year-old could understand?
2. **Deeper explanation** — how does it actually work? What are the moving parts?
3. **Real-world example or analogy** — connect it to something familiar (factories, smartphones, traffic lights, etc.)
4. **Why it matters** — why do engineers/professionals care about this?
5. **Key facts for exam** — bullet points of the most testable details

COMPLETENESS RULES:
• Never say "I'll skip this" or "this is out of scope" — if it's in the document, explain it fully.
• If a question covers multiple topics, explain each one completely before moving to the next.
• Never stop mid-explanation. Always finish every section.
• If there are 8 subtopics, explain all 8. If there are 5 types, list and explain all 5.

CONTENT RULES:
• Base your answers on the provided document content.
• You may add well-known real-world examples and analogies to aid understanding — this is encouraged.
• If something is not in the document, say so, then explain what you do know about it.

REFUSAL: Only decline if asked to complete homework/exams for the student. Instead, teach the concept so they can solve it themselves."""


# ── LLM factory ───────────────────────────────────────────────────────────────

def _get_llm(max_tokens: int = 8192):
    """Return the configured LLM with a generous output token limit."""
    if _LLM_PROVIDER == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            temperature=0.2,
            max_tokens=max_tokens,
            api_key=os.getenv("GROQ_API_KEY"),
        )
    elif _LLM_PROVIDER == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            max_tokens=max_tokens,
            api_key=os.getenv("OPENAI_API_KEY"),
        )
    else:  # gemini
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            temperature=0.2,
            max_output_tokens=max_tokens,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
        )


def _is_skippable(err: str) -> bool:
    return any(x in err for x in (
        "429", "rate_limit_exceeded", "RESOURCE_EXHAUSTED", "quota",
        "decommissioned", "deprecated", "not supported", "model_not_found",
    ))

def _is_rate_limit(err: str) -> bool:
    return _is_skippable(err)


def _try_model(prompt: str, system: str | None, provider: str, model: str, max_tokens: int) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage
    if provider == "groq":
        from langchain_groq import ChatGroq
        llm = ChatGroq(model=model, temperature=0.2, max_tokens=max_tokens,
                       api_key=os.getenv("GROQ_API_KEY"))
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(model=model, temperature=0.2, max_output_tokens=max_tokens,
                                     google_api_key=os.getenv("GOOGLE_API_KEY", ""))
    msgs = []
    if system:
        msgs.append(SystemMessage(content=system))
    msgs.append(HumanMessage(content=prompt))
    resp = llm.invoke(msgs)
    return resp.content if hasattr(resp, "content") else str(resp)


# ── Model chains ──────────────────────────────────────────────────────────────
# ANSWER chain: best quality first — 70B → Scout 17B → Gemini Flash → 8B fallback
_ANSWER_CHAIN = [
    ("groq",   "llama-3.3-70b-versatile"),
    ("groq",   "meta-llama/llama-4-scout-17b-16e-instruct"),
    ("gemini", "gemini-2.0-flash"),
    ("groq",   "llama-3.1-8b-instant"),
    ("gemini", "gemini-1.5-flash"),
]

# SIMPLE chain: speed-optimised for JSON generation tasks (summary, quiz, flashcards)
_SIMPLE_CHAIN = [
    ("groq",   "llama-3.1-8b-instant"),
    ("groq",   "meta-llama/llama-4-scout-17b-16e-instruct"),
    ("gemini", "gemini-2.0-flash"),
    ("groq",   "llama-3.3-70b-versatile"),
    ("gemini", "gemini-1.5-flash"),
]


def _invoke(prompt: str, max_tokens: int = 4096, retries: int = 0) -> str:
    """Best-quality chain with system prompt — used for all student-facing answers."""
    last_err = None
    for provider, model in _ANSWER_CHAIN:
        if provider == "gemini" and not os.getenv("GOOGLE_API_KEY", ""):
            continue
        try:
            logger.info("[LLM] Trying %s/%s", provider, model)
            return _try_model(prompt, _SYSTEM_PROMPT, provider, model, max_tokens)
        except Exception as e:
            err = str(e)
            if _is_rate_limit(err):
                logger.warning("[LLM] %s/%s rate-limited, trying next…", provider, model)
                last_err = err
                continue
            raise

    raise RuntimeError(f"All models rate-limited. Last error: {last_err}")


def _invoke_simple(prompt: str, max_tokens: int = 4096, retries: int = 0) -> str:
    """Speed-optimised chain without system prompt — used for JSON generation tasks."""
    last_err = None
    for provider, model in _SIMPLE_CHAIN:
        if provider == "gemini" and not os.getenv("GOOGLE_API_KEY", ""):
            continue
        try:
            return _try_model(prompt, None, provider, model, max_tokens)
        except Exception as e:
            err = str(e)
            if _is_rate_limit(err):
                last_err = err
                continue
            raise

    raise RuntimeError(f"All models rate-limited. Last error: {last_err}")


def _extract_json(text: str) -> Any:
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the outermost JSON array [...] in the text
    start = text.find("[")
    end   = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    # Find the outermost JSON object {...} in the text
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in response: {text[:200]}")


# ── Context cleaner ───────────────────────────────────────────────────────────

def _clean_context(context: str) -> str:
    """
    Deduplicate lines and strip repetitive meta-instructions that some
    documents contain, so the LLM sees clean problem content.
    """
    skip_phrases = [
        "please make sure", "please provide", "please be very",
        "please follow", "please note that", "please ensure",
    ]
    lines = context.split("\n")
    seen: set = set()
    cleaned = []
    prev = ""
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        if any(p in lower for p in skip_phrases):
            continue
        key = lower[:80]
        if key and key == prev:
            continue
        if key in seen and len(key) > 20:
            continue
        seen.add(key)
        prev = key
        cleaned.append(line)
    return "\n".join(cleaned)


# ── Document splitting helpers ────────────────────────────────────────────────

def _split_into_sections(text: str, section_size: int = _SECTION_SIZE) -> List[str]:
    sections, current = [], ""
    for para in text.split("\n\n"):
        if len(current) + len(para) > section_size and current:
            sections.append(current.strip())
            current = para
        else:
            current += "\n\n" + para
    if current.strip():
        sections.append(current.strip())
    return sections


def _is_long(text: str) -> bool:
    return len(text) > _LONG_DOC_THRESHOLD


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

def generate_answer(context: str, question: str) -> str:
    """
    Core RAG answer — uses the best available model with a rich teaching prompt.
    """
    clean = _clean_context(context)

    prompt = f"""Below is content from the student's study document, followed by their question.
Give a response that matches the quality of the world's best tutors — thorough, clear, example-driven, and easy to understand.

━━━ DOCUMENT CONTENT ━━━
{clean}
━━━━━━━━━━━━━━━━━━━━━━━━

STUDENT'S QUESTION: {question}

HOW TO ANSWER (follow this exactly):

**Step 1 — Understand the question**
Identify every concept, topic, and subtopic the student is asking about. If the question is broad, cover everything relevant in the document.

**Step 2 — Explain each concept using this structure:**
For EACH topic or subtopic:
- ## Topic Name  (use heading)
- **What it is:** One-sentence simple definition
- **How it works:** Full explanation — mechanisms, stages, components, process
- **Real-world example or analogy:** Something relatable (factory, phone, traffic system, etc.)
- **Why it matters / Applications:** Practical significance
- Bullet list of key properties, types, advantages, or steps if applicable

**Step 3 — Go deep on every subtopic**
If a topic has subtopics (e.g. "Types of X", "Components of Y"), use ### subheadings and explain EACH one individually. Never bundle them with "etc." or skip any.

**Step 4 — End with Key Takeaways**
## Key Takeaways
Bullet list of the most important points a student must remember for their exam.

QUALITY STANDARDS:
✓ Write at the level of Claude or ChatGPT — detailed, intelligent, genuinely helpful
✓ Use examples and analogies generously — they are how students actually learn
✓ Every technical term must be defined when first used
✓ Never say "as mentioned above" or "refer to section X" — fully explain everything inline
✓ Never truncate or stop early — complete every single section
✓ If the document doesn't cover something the student needs, say so and explain what you know

Answer now:"""

    return _invoke(prompt, max_tokens=8192)


# ── Topics ───────────────────────────────────────────────────────────────────

def generate_topics(text: str) -> dict:
    """Extract ALL topics/subtopics from across the entire document and return structured data + display markdown."""

    # Pass full sampled text — do not truncate further
    doc_text = text[:38000]

    prompt = f"""You are analyzing a student's study document. Your job is to find and list EVERY SINGLE topic and subtopic present — from the FIRST page to the LAST page. Do NOT skip anything.

Return ONLY valid JSON in exactly this format:
{{"topics": [{{"title": "Exact Topic Name", "subtopics": ["subtopic a", "subtopic b", "subtopic c"]}}]}}

CRITICAL RULES:
1. Scan the ENTIRE document — topics at the end are just as important as topics at the start
2. List EVERY main heading/topic you see
3. List ALL subtopics/sub-headings under each topic
4. Use the exact names from the document
5. A topic with no subtopics should have an empty subtopics array []
6. Do NOT merge separate topics — keep each one distinct
7. Aim for completeness — it is better to list too many topics than to miss one

DOCUMENT CONTENT:
{doc_text}

JSON:"""

    raw = _invoke_simple(prompt, max_tokens=3000)
    try:
        data = _extract_json(raw)
        topics_list = data.get("topics", []) if isinstance(data, dict) else []
    except Exception:
        topics_list = []

    # Build display markdown
    if topics_list:
        total_items = sum(1 + len(t.get("subtopics", [])) for t in topics_list)
        lines = [f"## I've analyzed your document and found **{len(topics_list)} topics** ({total_items} total items)\n"]
        for i, t in enumerate(topics_list):
            lines.append(f"**{i + 1}. {t['title']}**")
            for st in t.get("subtopics", []):
                lines.append(f"   - {st}")
            lines.append("")
        lines.append("---")
        lines.append(
            f"I'll walk you through all **{total_items} topics and subtopics** one by one.\n\n"
            "Type **explain** to start with the first topic, then **next** to move to each one in order.\n"
            "You can also ask me any question about the document directly."
        )
        markdown = "\n".join(lines)
    else:
        markdown = (
            "I have analyzed your document.\n\n"
            "Ask me anything about its contents, or type **explain** for a guided topic walkthrough."
        )

    return {
        "content":  markdown,
        "topics":   [{"title": t["title"], "subtopics": t.get("subtopics", [])} for t in topics_list],
    }


def generate_brief_item(text: str, title: str, parent_topic: str | None, index: int, total: int) -> str:
    """Teaching-quality explanation of one topic or subtopic — uses best model chain."""

    doc_text = text[:20000]

    if parent_topic:
        prompt = f"""You are an expert study tutor explaining one subtopic to a student. Write like the best teachers do — clear, detailed, with a real example.

Subtopic {index} of {total}: **{title}**
*(Part of: {parent_topic})*

Write your explanation using this structure:

### {title}
*(under {parent_topic})*

**What it is:**
A clear 2-3 sentence definition in simple language. Define any technical terms immediately.

**How it works:**
Full explanation of the mechanism, process, or concept. Use numbered steps if it's a process. Be specific — no vague statements.

**Real-world example:**
Give a concrete, relatable example (like a factory, a smartphone app, everyday life). This is how students actually understand things.

**Key details for exam:**
- [specific testable fact]
- [specific testable fact]
- [specific testable fact]
- [add more if needed]

**Remember:**
One sentence on the single most important thing about this subtopic.

SOURCE DOCUMENT:
{doc_text}

Explain ONLY "{title}" under "{parent_topic}". Be thorough — write at the level of a great textbook."""

    else:
        prompt = f"""You are an expert study tutor explaining one topic to a student. Write like the best teachers do — clear, detailed, with real examples and analogies.

Topic {index} of {total}: **{title}**

Write your explanation using this structure:

## {title}

**What it is:**
A clear 2-3 sentence introduction in simple language. Define technical terms immediately.

**How it works / How it's used:**
Full explanation — cover the mechanisms, components, stages, or process involved. Use numbered steps if it's sequential. Be specific and complete.

**Real-world example or analogy:**
Give a concrete, relatable example or comparison to something the student already knows. This is critical for understanding.

**Types / Components / Advantages (if applicable):**
If this topic has subtypes, components, or a list of properties — list and briefly explain each one.

**Why it matters:**
1-2 sentences on its real-world importance or applications.

**Key facts for exam:**
- [specific testable fact]
- [specific testable fact]
- [specific testable fact]
- [add more if needed]

**Remember:**
One sentence — the single most important thing about this topic.

SOURCE DOCUMENT:
{doc_text}

Explain ONLY "{title}". Write at the level of a great textbook — detailed, clear, and example-rich."""

    return _invoke(prompt, max_tokens=2000)


# ── Summary ───────────────────────────────────────────────────────────────────

def _post_process_summary(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Auto-derive key_concepts from every topic title so the chips section
    always contains 100% of the topics — including subtopics.
    """
    topics = result.get("topics", [])
    # Use all topic titles as key_concepts (every chip = a real topic with an explanation)
    titles = [t.get("title", "") for t in topics if t.get("title")]
    # Also keep any extra key_concepts the LLM produced that aren't already in titles
    existing = set(t.lower() for t in titles)
    extras = [c for c in result.get("key_concepts", []) if c.lower() not in existing]
    result["key_concepts"] = titles + extras
    return result


def generate_summary(text: str) -> Dict[str, Any]:
    if not _is_long(text):
        return _generate_summary_direct(text)
    return _generate_summary_map_reduce(text)


def _generate_summary_direct(text: str) -> Dict[str, Any]:
    prompt = f"""You are building a complete exam study guide from a student's document. Your output must cover EVERY main topic AND every subtopic — nothing can be skipped.

CRITICAL RULE ABOUT SUBTOPICS:
If a main topic (e.g. "PLC Architecture") has subtopics (e.g. "CPU", "Memory", "I/O Modules", "Power Supply"), you MUST create a SEPARATE topics entry for EACH subtopic. Do NOT lump subtopics together — each one needs its own explanation and key points.

Example of CORRECT output (subtopics as separate entries):
[
  {{"title": "PLC Architecture", "explanation": "Overview explanation...", "key_points": ["point", "point", "point"]}},
  {{"title": "CPU Unit", "explanation": "Dedicated explanation of CPU...", "key_points": ["point", "point", "point"]}},
  {{"title": "Memory Types in PLC", "explanation": "Dedicated explanation...", "key_points": ["point", "point", "point"]}},
  {{"title": "I/O Modules", "explanation": "Dedicated explanation...", "key_points": ["point", "point", "point"]}}
]

Return ONLY valid JSON:
{{
  "topics": [
    {{
      "title": "Exact name from document",
      "explanation": "4-6 complete sentences. Define it clearly, explain how it works, why it matters, give exam-relevant details. Write as if the student has never seen this before.",
      "key_points": ["key fact 1", "key fact 2", "key fact 3"]
    }}
  ],
  "definitions": [{{"term": "Term", "definition": "2-3 sentence definition with context."}}],
  "exam_tips": ["Specific actionable tip based on actual content"]
}}

RULES:
- topics array must contain EVERY main topic AND every subtopic as separate entries
- If the document has 8 main topics with 4 subtopics each, you must produce 40 topic entries
- EXACTLY 3 key_points per topic entry
- definitions: all key technical terms — aim for 15-25
- exam_tips: 6-10 specific tips based on this document's actual content
- Never merge, skip, or abbreviate — completeness is the #1 priority

DOCUMENT:
{text[:40000]}

JSON:"""
    raw = _invoke_simple(prompt, max_tokens=8000)
    try:
        result = _extract_json(raw)
        return _post_process_summary(result)
    except Exception:
        return {"key_concepts": [], "topics": [], "definitions": [], "exam_tips": [], "_raw": raw[:300]}


def _map_section_summary(section: str, section_num: int, total: int) -> str:
    prompt = f"""Extract EVERY topic AND subtopic from this document section as SEPARATE entries. Each subtopic must be its own object — never bundle subtopics inside a parent.

CORRECT (subtopics as separate entries):
[
  {{"title": "Main Topic", "explanation": "...", "key_points": ["p1","p2","p3"]}},
  {{"title": "Subtopic A", "explanation": "...", "key_points": ["p1","p2","p3"]}},
  {{"title": "Subtopic B", "explanation": "...", "key_points": ["p1","p2","p3"]}}
]

Return ONLY a valid JSON array:
[
  {{
    "title": "Exact name from document",
    "explanation": "4-6 complete sentences explaining this specific topic or subtopic — what it is, how it works, why it matters.",
    "key_points": ["key fact 1", "key fact 2", "key fact 3"]
  }}
]

RULES:
- One entry per topic, one entry per subtopic — never combine them
- Do NOT skip any heading, concept, or subtopic from this section
- EXACTLY 3 key_points per entry
- If this section has 10 subtopics, produce 10+ entries

SECTION {section_num} of {total}:
{section}

JSON array:"""
    return _invoke_simple(prompt, max_tokens=2500)


def _generate_summary_map_reduce(text: str) -> Dict[str, Any]:
    sections = _split_into_sections(text, _SECTION_SIZE)
    total = len(sections)
    logger.info("[LLM] Map-Reduce: %d sections, ~%dk chars", total, len(text) // 1000)

    all_topics: list = [None] * total

    def _process(i, section):
        logger.info("[LLM] Section %d/%d…", i + 1, total)
        raw = _map_section_summary(section, i + 1, total)
        try:
            result = _extract_json(raw)
            return i, result if isinstance(result, list) else []
        except Exception:
            return i, []

    with ThreadPoolExecutor(max_workers=_MAP_WORKERS) as pool:
        futures = {pool.submit(_process, i, sec): i for i, sec in enumerate(sections)}
        for future in as_completed(futures):
            i, topics = future.result()
            all_topics[i] = topics

    flat_topics = [t for bucket in all_topics if bucket for t in bucket]

    topics_text = "\n\n".join(
        f"TOPIC: {t.get('title','')}\n{t.get('explanation','')}\nPoints: {'; '.join(t.get('key_points',[]))}"
        for t in flat_topics
    )

    reduce_prompt = f"""Below are topic entries extracted from ALL {total} sections of a study document. Compile them into one final exam study guide JSON. Every entry below must appear in your output — do NOT drop, merge (unless exact duplicates), or skip any.

Return ONLY valid JSON:
{{
  "topics": [
    {{
      "title": "Topic or Subtopic Name",
      "explanation": "4-6 complete sentences — merge and expand the notes into a clear explanation of what this is, how it works, and why it matters for the exam.",
      "key_points": ["key fact 1", "key fact 2", "key fact 3"]
    }}
  ],
  "definitions": [{{"term": "Term", "definition": "2-3 sentence definition with context."}}],
  "exam_tips": ["Specific actionable exam tip"]
}}

RULES:
- Keep EVERY unique topic and subtopic as its own entry — only drop exact word-for-word duplicates
- Each entry needs EXACTLY 3 key_points
- definitions: all key technical terms across the full document (15-25 terms)
- exam_tips: 8-10 specific, actionable tips based on this document's content

ALL EXTRACTED ENTRIES:
{topics_text[:24000]}

JSON:"""

    raw = _invoke_simple(reduce_prompt, max_tokens=8000)
    try:
        result = _extract_json(raw)
        result["_sections_processed"] = total
        result["_strategy"] = "map-reduce"
        return _post_process_summary(result)
    except Exception:
        fallback = {
            "key_concepts": [],
            "topics": flat_topics,
            "definitions": [],
            "exam_tips": [],
            "_strategy": "map-reduce-partial",
        }
        return _post_process_summary(fallback)


# ── Quiz ──────────────────────────────────────────────────────────────────────

def generate_quiz(chunks: List[str], num_questions: int = 5, focus: str = "", seed: int = 0) -> List[Dict[str, Any]]:
    text = "\n\n".join(chunks)
    if not _is_long(text):
        return _generate_quiz_direct(text, num_questions, focus, seed)
    return _generate_quiz_distributed(chunks, num_questions, focus, seed)


def _generate_quiz_direct(text: str, num_questions: int, focus: str = "", seed: int = 0) -> List[Dict[str, Any]]:
    focus_line = f"Focus this quiz on: {focus} (seed={seed}, vary from typical)." if focus else ""
    prompt = f"""Output ONLY a raw JSON array of exactly {num_questions} MCQ objects. No explanation, no markdown, no text before or after. Start with [ and end with ].
{focus_line}

[{{"question":"Full question ending with ?","options":{{"A":"...","B":"...","C":"...","D":"..."}},"correct_answer":"A","explanation":"2-3 sentence explanation of why A is correct and others are wrong."}}]

Rules:
- Unique questions, real understanding (not just recall)
- Vary types: What is? Why? How? Which of the following?
- Spread across DIFFERENT topics — no clustering
- All 4 options must be plausible
- Exactly {num_questions} questions

STUDY MATERIAL:
{text[:12000]}

["""
    raw = _invoke_simple(prompt, max_tokens=3000)
    try:
        return _extract_json(raw)
    except Exception:
        return [{"question": "Parse error.", "options": {"A": raw[:100], "B": "", "C": "", "D": ""}, "correct_answer": "A", "explanation": ""}]


def _map_section_quiz_material(section: str, section_num: int, total: int, questions_needed: int) -> str:
    prompt = f"""From section {section_num}/{total} of a study document, identify {questions_needed} testable facts.

For each fact write:
FACT: [testable concept]
DISTRACTOR1: [plausible wrong answer]
DISTRACTOR2: [another plausible wrong answer]

SECTION:
{section}

FACTS:"""
    return _invoke_simple(prompt, max_tokens=800)


def _generate_quiz_distributed(chunks: List[str], num_questions: int, focus: str = "", seed: int = 0) -> List[Dict[str, Any]]:
    sections = _split_into_sections("\n\n".join(chunks), _SECTION_SIZE)
    total = len(sections)
    qps = max(1, round(num_questions / total))

    all_facts: list = [None] * total

    def _quiz_section(i, section):
        facts = _map_section_quiz_material(section, i+1, total, qps)
        return i, f"=== Section {i+1} ===\n{facts}"

    with ThreadPoolExecutor(max_workers=_MAP_WORKERS) as pool:
        futures = {pool.submit(_quiz_section, i, sec): i for i, sec in enumerate(sections)}
        for future in as_completed(futures):
            i, facts = future.result()
            all_facts[i] = facts

    all_facts = [f for f in all_facts if f]

    reduce_prompt = f"""Convert these study facts into exactly {num_questions} unique MCQ questions drawn from ALL sections.
Return ONLY a valid JSON array — no markdown.

[{{
  "question": "A complete exam-style question ending with ?",
  "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
  "correct_answer": "A",
  "explanation": "Detailed 2-3 sentence explanation."
}}]

RULES:
- Each question must be unique — no duplicate topics.
- Vary question types: What is? Why? How? Which of the following?
- All 4 options must be plausible — no obviously wrong distractors.
- Spread evenly across ALL sections.

FACTS:
{chr(10).join(all_facts)[:14000]}

JSON:"""
    raw = _invoke_simple(reduce_prompt, max_tokens=4096)
    try:
        return _extract_json(raw)
    except Exception:
        return [{"question": "Parse error.", "options": {"A": raw[:100], "B": "", "C": "", "D": ""}, "correct_answer": "A", "explanation": ""}]


# ── Flashcards ────────────────────────────────────────────────────────────────

def generate_flashcards(chunks: List[str], num_cards: int = 10) -> List[Dict[str, str]]:
    text = "\n\n".join(chunks)
    result = _generate_flashcards_direct(text, num_cards) if not _is_long(text) \
             else _generate_flashcards_distributed(chunks, num_cards)
    # Hard-enforce the requested count — LLMs sometimes produce one extra card
    return result[:num_cards]


def _generate_flashcards_direct(text: str, num_cards: int) -> List[Dict[str, str]]:
    prompt = f"""Output ONLY a raw JSON array of EXACTLY {num_cards} flashcard objects — no more, no less.
No explanation, no markdown, no text before or after. Start with [ and end with ].

Format:
[{{"front": "Full exam question ending with ?", "back": "2-3 sentence answer"}}]

Rules:
- front: full question ending with "?" — never a heading or topic name
  BAD: "Importance of PLC"  GOOD: "What is the importance of PLC in industrial automation?"
- back: thorough 2-3 sentence answer
- Cover different topics across the entire material
- YOU MUST OUTPUT EXACTLY {num_cards} OBJECTS — count carefully before finishing

STUDY MATERIAL:
{text[:12000]}

["""
    raw = _invoke_simple(prompt, max_tokens=3000)
    try:
        return _extract_json(raw)
    except Exception:
        return [{"front": "Parse error.", "back": raw[:200]}]


def _map_section_flashcard_material(section: str, section_num: int, total: int, cards_needed: int) -> str:
    prompt = f"""From section {section_num}/{total} of a study document, create {cards_needed} exam flashcard pairs.

RULES:
- Q must be a FULL question ending with "?" (never just a topic name or heading)
  BAD: "Importance of PLC"
  GOOD: "What is the importance of PLC in industrial automation?"
- A must be a complete 2-3 sentence explanation.

Format exactly like this:
Q: [Full question ending with ?]
A: [2-3 sentence answer]

SECTION:
{section}

PAIRS:"""
    return _invoke_simple(prompt, max_tokens=800)


def _generate_flashcards_distributed(chunks: List[str], num_cards: int) -> List[Dict[str, str]]:
    sections = _split_into_sections("\n\n".join(chunks), _SECTION_SIZE)
    total = len(sections)
    cps = max(1, round(num_cards / total))

    all_pairs: list = [None] * total

    def _fc_section(i, section):
        pairs = _map_section_flashcard_material(section, i+1, total, cps)
        return i, f"=== Section {i+1} ===\n{pairs}"

    with ThreadPoolExecutor(max_workers=_MAP_WORKERS) as pool:
        futures = {pool.submit(_fc_section, i, sec): i for i, sec in enumerate(sections)}
        for future in as_completed(futures):
            i, pairs = future.result()
            all_pairs[i] = pairs

    all_pairs = [p for p in all_pairs if p]

    reduce_prompt = f"""Output ONLY a raw JSON array of exactly {num_cards} flashcard objects. No explanation, no markdown, no text before or after. Start with [ and end with ].

[{{"front": "Full exam question ending with ?", "back": "2-3 sentence answer"}}]

Rules:
- front: full question ending with "?" — never a heading or topic name
- back: thorough 2-3 sentence answer
- Spread evenly across all sections
- Exactly {num_cards} cards

SOURCE PAIRS:
{chr(10).join(all_pairs)[:14000]}

["""
    raw = _invoke_simple(reduce_prompt, max_tokens=3000)
    try:
        return _extract_json(raw)
    except Exception:
        return [{"front": "Parse error.", "back": raw[:200]}]
