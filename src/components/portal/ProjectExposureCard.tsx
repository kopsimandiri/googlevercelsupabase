import React from 'react';
import { ProjectExposure } from '../../services/projectExposureService';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { OptimizedImage } from '../common/OptimizedImage';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

interface ProjectExposureCardProps {
  project: ProjectExposure;
  onSelect: (project: ProjectExposure) => void;
}

export const ProjectExposureCard: React.FC<ProjectExposureCardProps> = ({ project, onSelect }) => {
  const coverPhoto = project.fotoGaleri[0] || '/assets/portfolio/perikanan-ikan-layang-ambon.jpg';

  return (
    <div
      id={`project-exposure-card-${project.id}`}
      className="group bg-surface rounded-[var(--radius-card)] border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Photo Container */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100">
          <OptimizedImage
            src={coverPhoto}
            alt={project.judul}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5 z-10">
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary-900/90 text-white backdrop-blur-xs border border-white/20 tracking-wide">
              {project.tagline}
            </span>
            {project.badge && (
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-accent-gold text-stone-950 shadow-xs">
                {project.badge}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 right-3 text-[11px] text-white/90 bg-stone-950/60 px-2.5 py-0.5 rounded-md backdrop-blur-xs font-mono">
            {project.fotoGaleri.length} Dokumentasi Foto
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-3">
          <span className="text-[11px] uppercase font-bold text-accent-gold-dark tracking-wider block">
            {project.tagline}
          </span>
          <h3 className="text-lg sm:text-xl font-bold font-serif text-text-dark leading-snug group-hover:text-primary-700 transition-colors">
            {project.judul}
          </h3>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-3">
            {project.konteks}
          </p>

          {/* Quick Impact Highlight */}
          <div className="pt-2 flex flex-wrap gap-2">
            {project.dampak.slice(0, 2).map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 text-[11px] font-semibold border border-emerald-200/70"
              >
                <Sparkles className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>
                  {item.label}: <strong className="text-emerald-950 font-bold">{item.nilai}</strong>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer Action */}
      <div className="px-6 pb-6 pt-2 border-t border-stone-100/80 flex items-center justify-between mt-auto">
        <div className="text-[11px] text-text-muted flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-primary-700" />
          <span>Rantai Pasok Hulu-Hilir</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSelect(project)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="shadow-xs"
        >
          Lihat Cerita Lengkap
        </Button>
      </div>
    </div>
  );
};
