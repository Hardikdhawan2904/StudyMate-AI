/**
 * FileUpload — Drag-and-drop upload with animated states.
 * Calls POST /api/upload, emits new doc to parent.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadDocument } from "../services/api";
import toast from "react-hot-toast";
import {
  FiUploadCloud, FiFile, FiCheckCircle,
  FiAlertCircle, FiArrowRight,
} from "react-icons/fi";

const ACCEPTED = ["pdf", "docx", "txt"];

function FileTypeChip({ ext }) {
  const styles = {
    pdf:  "bg-red-900/30 text-red-300 border-red-700/30",
    docx: "bg-blue-900/30 text-blue-300 border-blue-700/30",
    txt:  "bg-green-900/30 text-green-300 border-green-700/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${styles[ext]}`}>
      .{ext}
    </span>
  );
}

export default function FileUpload({ documents, setDocuments, setSelectedDocId, setActiveSection, userId = 0 }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [justUploaded, setJustUploaded] = useState(null);
  const fileRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      toast.error("Only PDF, DOCX, and TXT files are supported.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setJustUploaded(null);
    const tid = toast.loading(`Processing ${file.name}…`);

    try {
      const result = await uploadDocument(file, setProgress, userId);
      const newDoc = {
        doc_id:     result.doc_id,
        name:       result.filename,
        num_chunks: result.num_chunks,
      };
      setDocuments((prev) => [...prev, newDoc]);
      setSelectedDocId(result.doc_id);
      setJustUploaded(newDoc);
      toast.success(`Indexed ${result.num_chunks} chunks!`, { id: tid });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed.", { id: tid });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Upload Study Material</h2>
        <p className="text-gray-500 text-sm mt-1">
          Drop your notes here — they'll be chunked, embedded, and stored for AI-powered Q&A.
        </p>
      </div>

      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        animate={dragging ? { scale: 1.015 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-12 text-center cursor-pointer transition-all duration-300
          ${uploading ? "pointer-events-none" : ""}`}
        style={{
          borderColor: dragging ? "rgba(124,58,237,0.7)" : "rgba(124,58,237,0.25)",
          background: dragging ? "rgba(124,58,237,0.08)" : "rgba(10,5,32,0.5)",
          backdropFilter: "blur(16px)",
          boxShadow: dragging
            ? "inset 0 0 50px rgba(124,58,237,0.12), 0 0 30px rgba(124,58,237,0.15)"
            : "inset 0 0 0 transparent",
        }}
        onMouseOver={(e) => {
          if (!dragging && !uploading) {
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)";
            e.currentTarget.style.background = "rgba(124,58,237,0.05)";
          }
        }}
        onMouseOut={(e) => {
          if (!dragging) {
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
            e.currentTarget.style.background = "rgba(10,5,32,0.5)";
          }
        }}
      >
        {/* Glow when dragging */}
        {dragging && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none"
               style={{ boxShadow: "inset 0 0 60px rgba(124,58,237,0.18)" }} />
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
        />

        {!uploading ? (
          <>
            <motion.div
              animate={dragging ? { scale: 1.2, y: -4 } : { scale: 1, y: 0 }}
              className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center mx-auto mb-5"
              style={{ boxShadow: "0 0 20px rgba(124,58,237,0.15)" }}
            >
              <FiUploadCloud className="text-purple-400 text-2xl" />
            </motion.div>
            <p className="text-gray-200 font-semibold text-base mb-1.5">
              {dragging ? "Drop your file here" : "Drag & drop your study file"}
            </p>
            <p className="text-gray-600 text-sm mb-5">or click to browse files</p>
            <div className="flex items-center justify-center gap-2">
              {ACCEPTED.map((ext) => <FileTypeChip key={ext} ext={ext} />)}
              <span className="text-gray-700 text-xs ml-1">· Max 50 MB</span>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center mx-auto">
              <span className="w-7 h-7 border-2 border-purple-300/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
            <p className="text-gray-300 font-medium">Processing document…</p>
            <div className="max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>Extracting & embedding</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Success state */}
      <AnimatePresence>
        {justUploaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="dash-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-200 truncate">{justUploaded.name}</p>
                <p className="text-xs text-emerald-400 mt-0.5">
                  ✓ Indexed {justUploaded.num_chunks} chunks — ready for AI
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSection("chat")}
              className="btn-glow px-4 py-2 text-sm flex items-center gap-2 self-start sm:self-auto flex-shrink-0"
            >
              Ask AI <FiArrowRight />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing docs summary */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
            Indexed Documents ({documents.length})
          </p>
          <div className="space-y-2">
            {documents.map((doc) => (
              <motion.div
                key={doc.doc_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.12)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
                  e.currentTarget.style.background = "rgba(124,58,237,0.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.12)";
                  e.currentTarget.style.background = "rgba(124,58,237,0.04)";
                }}
              >
                <FiFile className="text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate font-medium">{doc.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{doc.num_chunks} indexed chunks</p>
                </div>
                <span className="badge-purple">{doc.name.split(".").pop().toUpperCase()}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="dash-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4">How It Works</p>
        <div className="space-y-3.5">
          {[
            ["Extract",  "Text is extracted from your PDF, DOCX, or TXT file"],
            ["Chunk",    "Content is split into overlapping semantic chunks"],
            ["Embed",    "Each chunk is converted to a vector using AI embeddings"],
            ["Retrieve", "Your questions find the most relevant chunks via FAISS similarity search"],
            ["Answer",   "The AI generates accurate, grounded answers from the retrieved context"],
          ].map(([step, desc], i) => (
            <div key={step} className="flex gap-3.5">
              <div className="w-5 h-5 rounded-full bg-purple-900/50 border border-purple-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-purple-400">{i + 1}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="text-gray-300 font-semibold">{step}: </span>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
