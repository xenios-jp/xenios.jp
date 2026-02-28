import type { Metadata } from "next";
import { Pill } from "@/components/pill";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Release history and development changelog for XeniOS. Track every build, feature, and fix across the project.",
};

interface ChangelogEntry {
  version: string;
  date: string;
  commit: string;
  summary: string;
  changes: string[];
}

const entries: ChangelogEntry[] = [
  {
    version: "v0.1.0-alpha",
    date: "February 15, 2026",
    commit: "abc1234",
    summary:
      "First public alpha release. Features the ARM64 JIT backend for PowerPC translation via Oaknut, Metal GPU rendering with SPIRV-Cross shader translation, SDL2 audio and input integration, and the compatibility tracking system. Intended for developer testing and early community feedback.",
    changes: [
      "ARM64 JIT backend translating PowerPC guest code to native ARM64 via Oaknut with iOS W^X support",
      "Metal GPU backend with Xenos shader translation through SPIR-V to MSL via SPIRV-Cross",
      "SDL2 audio output (CoreAudio on iOS) with XMA decoding via FFmpeg",
      "SDL2 input driver supporting up to 4 controllers via GameController framework",
      "Game loader supporting GOD packages, ISO disc images, ZArchive, XEX executables, and STFS packages",
      "TOML-based configuration system with per-game config overrides",
      "Compatibility tracking database with per-device status reporting",
    ],
  },
  {
    version: "v0.0.2-dev",
    date: "January 28, 2026",
    commit: "def5678",
    summary:
      "Second development preview focused on GPU rendering. Adds the Metal rendering pipeline with SPIRV-Cross shader cross-compilation, EDRAM render target emulation, and sandboxed file system access for game assets.",
    changes: [
      "Metal rendering pipeline with double-buffered swap chain and EDRAM render target cache",
      "SPIRV-Cross integration for Xenos microcode to MSL shader cross-compilation",
      "Texture cache and shared memory mirroring of the Xbox 360's 512MB unified memory",
      "Frame timing diagnostics overlay for performance profiling",
      "Logging infrastructure with configurable verbosity levels via TOML config",
    ],
  },
  {
    version: "v0.0.1-dev",
    date: "January 10, 2026",
    commit: "789abcd",
    summary:
      "First internal build. Establishes the ARM64 JIT backend, initialises Metal graphics device, and stubs out core Xbox 360 kernel functions for memory management and threading.",
    changes: [
      "ARM64 JIT backend scaffold using Oaknut for native code generation",
      "Metal device initialisation and command queue setup on Apple GPU",
      "Core Xbox 360 kernel stubs (xboxkrnl) for memory management, threading, and I/O",
      "Premake5 build system targeting iOS 17.0+ ARM64",
      "Project documentation and contribution guidelines",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Changelog
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Every build, every fix, every step forward.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="max-w-3xl">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border md:left-[23px]" />

            <div className="flex flex-col gap-10">
              {entries.map((entry, index) => (
                <div key={entry.version} className="relative pl-12 md:pl-14">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 top-6 h-3 w-3 rounded-full border-2 md:left-3.5 ${
                      index === 0
                        ? "border-accent bg-accent/20"
                        : "border-border-hover bg-bg-surface"
                    }`}
                  />

                  {/* Card */}
                  <div className="rounded-xl border border-border bg-bg-surface p-8">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Pill variant="tag">{entry.version}</Pill>
                      <span className="text-sm text-text-muted">
                        {entry.date}
                      </span>
                      <code className="font-mono text-xs text-text-muted">
                        {entry.commit}
                      </code>
                    </div>

                    {/* Summary */}
                    <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
                      {entry.summary}
                    </p>

                    {/* Changes */}
                    <ul className="mt-4 space-y-2">
                      {entry.changes.map((change) => (
                        <li
                          key={change}
                          className="flex items-start gap-2 text-[15px] leading-relaxed text-text-secondary"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-text-muted" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
