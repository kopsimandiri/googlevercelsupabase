import React, { useState } from 'react';
import { ProjectExposure } from '../../services/projectExposureService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon,
  Quote,
  Layers,
} from 'lucide-react';

interface ProjectExposureDetailProps {
  project: ProjectExposure;
  onClose: () => void;
}

export const ProjectExposureDetail: React.FC<ProjectExposureDetailProps> = ({
  project,
  onClose,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const prevPhoto = () => {
    setActivePhotoIndex((prev) =>
      prev === 0 ? project.fotoGaleri.length - 1 : prev - 1
    );
  };

  const nextPhoto = () => {
    setActivePhotoIndex((prev) =>
      prev === project.fotoGaleri.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div
      id="project-exposure-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-surface rounded-[var(--radius-card)] border border-stone-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-accent-gold/15 text-accent-gold-dark border border-accent-gold/30">
              {project.tagline}
            </span>
            {project.badge && (
              <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary-700 text-white">
                {project.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup jendela detail"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-text-dark">
          {/* Main Title & Tagline */}
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold text-accent-gold-dark tracking-widest block">
              {project.tagline}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-text-dark leading-tight">
              {project.judul}
            </h2>
          </div>

          {/* Photo Gallery with Interactive Carousel & Thumbnails */}
          <div className="space-y-3">
            <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 shadow-inner group">
              <img
                src={project.fotoGaleri[activePhotoIndex]}
                alt={`${project.judul} - Foto ${activePhotoIndex + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-500"
              />

              {/* Navigation Arrows for Multiple Photos */}
              {project.fotoGaleri.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/50 hover:bg-stone-950/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100"
                    aria-label="Foto sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/50 hover:bg-stone-950/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100"
                    aria-label="Foto selanjutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Photo Indicator */}
              <div className="absolute bottom-3 left-3 bg-stone-950/60 text-white px-3 py-1 rounded-md text-xs backdrop-blur-xs font-mono">
                {activePhotoIndex + 1} / {project.fotoGaleri.length}
              </div>
            </div>

            {/* Thumbnail Navigation Strip */}
            {project.fotoGaleri.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {project.fotoGaleri.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activePhotoIndex === idx
                        ? 'border-primary-700 ring-2 ring-primary-700/30'
                        : 'border-stone-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Context Narrative */}
          <div className="space-y-3 max-w-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-700" />
              Latar Belakang & Konteks Strategis
            </h3>
            <p className="text-base leading-relaxed text-stone-700">
              {project.konteks}
            </p>
          </div>

          {/* Value Chain Flow (Rantai Nilai Hulu ke Hilir) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-700" />
              Alur Rantai Nilai (Hulu ke Hilir)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {project.rantaiNilai.map((tahap, idx) => (
                <div
                  key={idx}
                  className="relative p-4 rounded-xl bg-primary-900/5 border border-primary-900/10 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-primary-900 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    {idx < project.rantaiNilai.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-primary-700/60 hidden md:block" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-primary-900 leading-snug">
                    {tahap}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Indicators */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Indikator Dampak & Kapasitas Riil
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {project.dampak.map((item, idx) => {
                const isPlaceholder =
                  item.nilai.trim().toLowerCase() === 'data akan diperbarui';
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1.5"
                  >
                    <span className="text-xs text-text-muted block font-medium">
                      {item.label}
                    </span>
                    {isPlaceholder ? (
                      <span className="text-sm text-stone-400 italic block font-normal">
                        Data akan diperbarui
                      </span>
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold font-serif text-text-dark block">
                        {item.nilai}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Closing Emotional Statement */}
          <div className="p-4 sm:p-5 rounded-r-xl bg-emerald-50/40 border-l-4 border-accent-gold space-y-2">
            <div className="flex items-center gap-1.5 text-accent-gold-dark text-xs font-semibold">
              <Quote className="w-4 h-4" />
              <span>Komitmen Koperasi</span>
            </div>
            <p className="text-sm sm:text-base italic text-primary-700 font-serif leading-relaxed">
              "{project.penutup}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-text-muted">
            KOPSIM Mandiri • Kemitraan Sektor Riil Berdaya Saing
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup Informasi
          </Button>
        </div>
      </div>
    </div>
  );
};
