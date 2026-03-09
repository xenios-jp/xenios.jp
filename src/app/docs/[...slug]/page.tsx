import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Callout } from "@/components/callout";
import { IosReadFirst } from "@/components/ios-read-first";
import {
  DISCORD_URL,
  EMULATOR_GITHUB_URL,
  EMULATOR_GITHUB_ISSUES_URL,
  SIDESTORE_JIT_GUIDE_URL,
  STIKDEBUG_RELEASES_URL,
  STIKDEBUG_UNIVERSAL_SCRIPT_URL,
  STIKDEBUG_URL,
} from "@/lib/constants";
import { withCanonical } from "@/lib/metadata";

interface DocEntry {
  title: string;
  description: string;
  content: React.ReactNode;
}

const C = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono bg-bg-surface-2 px-1.5 py-0.5 rounded text-text-primary">
    {children}
  </code>
);

const iosDocs: Record<string, DocEntry> = {
  "getting-started": {
    title: "Getting Started",
    description:
      "Install XeniOS and run your first Xbox 360 game on iOS.",
    content: (
      <>
        <h2>Read First</h2>
        <div className="mb-6">
          <Callout type="warning">
            <IosReadFirst tone="secondary" />
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              If you are blocked on setup, use{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-accent-hover font-semibold"
              >
                Discord
              </a>
              .
            </p>
          </Callout>
        </div>

        <h2>Prerequisites</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          You will need an ARM64 iPhone or iPad with Metal support. The lowest
          tested setup right now is <strong className="text-text-primary">iOS / iPadOS 18.0</strong> on{" "}
          <strong className="text-text-primary">A16-class hardware</strong>.
          Older versions or older chips may work, but they are currently
          untested. Do not upgrade to{" "}
          <strong className="text-text-primary">iOS / iPadOS 26.4 beta</strong>{" "}
          right now. You will also need game files dumped from your own Xbox
          360 discs. XeniOS does not include, provide, or link to any game
          files. Piracy is not supported or condoned.
        </p>

        <h2>Installation</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Download the latest IPA from the{" "}
          <Link
            href="/download/ios"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            downloads page
          </Link>
          . The current documented public install path is manual IPA sideloading
          through SideStore:
        </p>
        <ul className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-text-primary"><a href="https://sidestore.io/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">SideStore</a></strong> —
            Download the IPA and open it with SideStore to install. On free
            Apple IDs, refreshes are still required every 7 days.
          </li>
        </ul>
        <div className="mb-6 mt-4">
          <Callout type="note">
            LiveContainer is not part of the documented public baseline.
            It is currently untested on iOS 26, though users have reported it
            working on iOS 18. Use it at your own risk, and expect to need the{" "}
            <C>com.apple.developer.kernel.increased-memory-limit</C>{" "}
            entitlement when signing it.
          </Callout>
        </div>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          If the install path itself is what is failing, use{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">Discord</a>{" "}
          for setup help before filing a bug.
        </p>

        <h2>JIT Setup</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          In StikDebug, assign the bundled{" "}
          <strong className="text-text-primary">Amethyst-MeloNX.js</strong> or{" "}
          <strong className="text-text-primary">universal.js</strong> script to
          XeniOS. If you do not see either script in the app, update to{" "}
          <a
            href={STIKDEBUG_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            StikDebug releases
          </a>{" "}
          or download{" "}
          <a
            href={STIKDEBUG_UNIVERSAL_SCRIPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            universal.js
          </a>{" "}
          directly and import it before troubleshooting anything else. Check
          the{" "}
          <a
            href={STIKDEBUG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            StikDebug repo
          </a>{" "}
          for more information.
        </p>

        <h2>Adding Games</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          After dumping games from Xbox 360 discs or digital purchases that
          you legally own, transfer the files into XeniOS using the Files app,
          AirDrop, or USB file sharing through Finder. The app also supports
          opening files from the iOS document picker. On launch, XeniOS
          automatically scans its Documents directory for supported game files.
        </p>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Most full-game dumps are in{" "}
          <strong className="text-text-primary">GOD</strong> (Games on Demand)
          format, the standard Xbox 360 installed-title layout. XeniOS also
          supports <C>.iso</C> disc images, <C>.xex</C> executables,{" "}
          <C>.zar</C> compressed archives, and STFS/XContent packages
          (<C>.con</C>, <C>.live</C>, <C>.pirs</C>) used for XBLA titles and
          DLC.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-accent whitespace-pre-wrap">{`Documents/
├── YourGame/           (GOD folder with .data/ subfolder)
├── YourGame.iso        (disc image)
├── YourGame.zar        (compressed archive)
├── content/            (STFS/XContent packages)
├── patches/            (manual game patch files)
├── xenios.config.toml
└── xenia.log`}</pre>
        </div>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Game patches are also supported on iPhone and iPad, but they are not
          currently exposed in the in-app UI. Bring the{" "}
          <C>patches</C> folder that contains your patch files into the main{" "}
          <C>XeniOS.app</C> folder, then edit those patch files manually in the
          Files app or an external text editor.
        </p>

        <h2>First Launch</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Tap a game in the library to start it. On first run, XeniOS
          translates Xbox 360 GPU shaders to Metal via SPIRV-Cross — this
          causes stuttering during the first few minutes of gameplay. Shader
          binaries are cached to disk (<C>store_shaders</C> is enabled
          by default), so subsequent launches will be smoother.
        </p>
      </>
    ),
  },
  settings: {
    title: "Settings Reference",
    description:
      "Graphics, performance, audio, input, and configuration options.",
    content: (
      <>
        <h2>In-App Settings</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          XeniOS includes a native iOS settings UI organized into four sections.
          These control the most common options. For advanced tuning, edit the
          config file directly.
        </p>

        <h2>Graphics</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <C>present_letterbox</C> — Maintain aspect ratio with
            letterboxing. Default: <C>true</C>.
          </li>
          <li>
            <C>present_safe_area_x</C> / <C>present_safe_area_y</C> —
            Safe area percentage (0–100). Default: <C>100</C>.
          </li>
          <li>
            <C>anisotropic_override</C> — Override anisotropic filter level.
            -1=auto, 0=off, 1=1x, 2=2x, 3=4x, 4=8x, 5=16x. Default: <C>-1</C>.
          </li>
          <li>
            <C>internal_display_resolution</C> — Resolution index (0–17).
            Default: <C>8</C> (1280x720). Common values: 0=640x480,
            8=1280x720, 16=1920x1080, 17=custom.
          </li>
        </ul>

        <h2>Performance</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <C>framerate_limit</C> — Host FPS cap. <C>0</C> = unlimited.
            Default: <C>0</C>.
          </li>
          <li>
            <C>guest_display_refresh_cap</C> — Vblank timing control for
            guest display refresh. Default: <C>true</C>.
          </li>
          <li>
            <C>async_shader_compilation</C> — Compile shaders asynchronously
            to reduce stutter. Default: <C>true</C>.
          </li>
        </ul>

        <h2>Compatibility</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <C>half_pixel_offset</C> — Half pixel offset correction. Some
            games need this toggled. Default: <C>true</C>.
          </li>
          <li>
            <C>occlusion_query_enable</C> — Enable GPU occlusion queries.
            Default: <C>false</C>.
          </li>
          <li>
            <C>gpu_allow_invalid_fetch_constants</C> — Allow invalid fetch
            constants. Fixes some game crashes. Default: <C>true</C>.
          </li>
        </ul>

        <h2>Audio</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          XMA audio is decoded via FFmpeg and output through SDL2 (CoreAudio on
          iOS).
        </p>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <C>mute</C> — Disable all audio output. Default: <C>false</C>.
          </li>
          <li>
            <C>apu_max_queued_frames</C> — Audio buffer queue size (4–64).
            Lower = less latency. Default: <C>8</C>.
          </li>
          <li>
            <C>xma_decoder</C> — XMA decoder implementation:{" "}
            <C>old</C>, <C>new</C>, <C>master</C>, or <C>fake</C>. Current
            builds may migrate defaults to <C>old</C> even though the
            code-defined base default is <C>new</C>.
          </li>
        </ul>

        <h2>Input</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          XeniOS uses SDL2 for input, bridging to Apple&#39;s GameController
          framework. Up to 4 controllers are supported simultaneously.
          Controllers are auto-detected — no configuration needed.
        </p>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <C>vibration</C> — Enable controller haptic feedback.
            Default: <C>true</C>.
          </li>
          <li>
            <C>left_stick_deadzone_percentage</C> /{" "}
            <C>right_stick_deadzone_percentage</C> — Stick deadzone (0.0–1.0).
            Default: <C>0.0</C>.
          </li>
        </ul>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Supported controllers: Xbox Wireless, PlayStation DualSense and
          DualShock 4, Nintendo Switch Pro, and MFi-certified gamepads. There
          are currently no touchscreen gameplay controls. Touch screen input
          is used for UI navigation only, and there is no touch-to-gamepad
          mapping.
        </p>

        <h2>Config Files</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          All settings are stored in <C>xenios.config.toml</C> in
          the app&#39;s Documents directory. Per-game overrides are created as{" "}
          <C>&lt;TITLEID&gt;.config.toml</C> files in the{" "}
          <C>config/</C> subdirectory.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-accent whitespace-pre-wrap">{`Documents/
├── xenios.config.toml              (global config)
└── config/
    └── 4D5307E6.config.toml        (per-game override for Halo 3)`}</pre>
        </div>
      </>
    ),
  },
  troubleshooting: {
    title: "Troubleshooting",
    description:
      "Fix common problems with XeniOS.",
    content: (
      <>
        <h2>App Crashes on Launch</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          If XeniOS crashes immediately after opening:
        </p>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          If you are not sure whether this is a setup problem or a real bug,
          ask in{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">Discord</a>{" "}
          first.
        </p>
        <ol className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-decimal pl-5">
          <li>
            Confirm you are on a tested setup. The lowest tested combination
            right now is iOS / iPadOS 18.0 on A16-class hardware.
          </li>
          <li>Re-sign the IPA — expired signing profiles are the most common cause.</li>
          <li>
            Ensure a JIT helper is active (StikDebug). Depending on your
            iOS / iPadOS version and device, you may also need LocalDevVPN.
            Check the{" "}
            <a
              href={SIDESTORE_JIT_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              latest SideStore JIT guide
            </a>{" "}
            if your current helper setup is unclear.
          </li>
          <li>
            Delete the shader cache at{" "}
            <C>Library/Caches/xenia/</C> via the Files app.
          </li>
          <li>Reboot your device and try again.</li>
        </ol>

        <h2>Black Screen After Game Loads</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Some titles require specific GPU settings. Try the following in
          Settings:
        </p>
        <ul className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            Toggle <C>half_pixel_offset</C> — some games render incorrectly
            with it enabled or disabled.
          </li>
          <li>
            Try switching <C>render_target_path</C> between{" "}
            <C>performance</C> and <C>accuracy</C>.
          </li>
          <li>
            Enable <C>gpu_allow_invalid_fetch_constants</C> if the game
            crashes during rendering.
          </li>
        </ul>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Check the{" "}
          <Link
            href="/compatibility"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            compatibility list
          </Link>{" "}
          for game-specific notes and recommended settings.
        </p>

        <h2>Low Frame Rate</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Performance varies by game and device. For the best results:
        </p>
        <ul className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>Close all background apps to free up RAM.</li>
          <li>
            Set <C>internal_display_resolution</C> to <C>0</C> (640x480) for
            maximum performance, or <C>8</C> (720p, default) for a balance.
          </li>
          <li>
            Make sure <C>store_shaders</C> and{" "}
            <C>metal_shader_disk_cache</C> are both enabled (default) so
            shaders are not recompiled every launch.
          </li>
          <li>
            Try enabling <C>metal_presenter_use_metalfx</C> to use MetalFX
            upscaling — render at a lower resolution and upscale.
          </li>
          <li>Avoid charging while playing to reduce thermal throttling.</li>
        </ul>

        <h2>Controller Not Detected</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Disconnect and reconnect your Bluetooth controller. If the issue
          persists, forget the device in iOS Bluetooth settings and re-pair it.
          XeniOS supports MFi, DualSense, DualShock 4, Xbox Wireless, and
          Nintendo Switch Pro controllers via the GameController framework.
        </p>

        <h2>Logs</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          XeniOS writes a log file to <C>Documents/xenia.log</C>. You can
          access it via the Files app or USB file sharing. To increase
          verbosity, set <C>log_level</C> in your config file:
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">{`# In xenios.config.toml:
log_level = 3    # 0=error, 1=warning, 2=info (default), 3=debug
log_mask = 0     # Bitmask: 1=Kernel, 2=APU, 4=CPU, 8=GPU`}</pre>
        </div>
      </>
    ),
  },
  "reporting-bugs": {
    title: "Reporting Bugs",
    description:
      "Help improve XeniOS by filing effective bug reports.",
    content: (
      <>
        <h2>Before You Report</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Check the{" "}
          <Link
            href="/docs/ios/troubleshooting"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            troubleshooting guide
          </Link>{" "}
          and existing GitHub issues first. Duplicate reports slow down triage.
        </p>

        <h2>What to Include</h2>
        <ul className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>XeniOS build version.</li>
          <li>Device model and iOS version.</li>
          <li>Game title and title ID (e.g. 4D5307E6).</li>
          <li>Steps to reproduce the issue.</li>
          <li>Expected vs. actual behavior.</li>
          <li>
            The <C>xenia.log</C> file (see below).
          </li>
        </ul>

        <h2>Gathering Logs</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          The log file is at <C>Documents/xenia.log</C>. Access it via the
          Files app (XeniOS has file sharing enabled) or USB. For a more
          detailed log, set <C>log_level</C> to <C>3</C> (debug) in{" "}
          <C>xenios.config.toml</C> before reproducing the issue.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">{`# Log file:
Documents/xenia.log

# For verbose output, set in xenios.config.toml:
log_level = 3
flush_log = true`}</pre>
        </div>

        <h2>Filing the Issue</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Open a new issue on the{" "}
          <a
            href={EMULATOR_GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            GitHub repository
          </a>{" "}
          using the Bug Report template. Attach the <C>xenia.log</C> file.
          Incomplete reports may be closed without investigation.
        </p>
      </>
    ),
  },
  developer: {
    title: "Developer Docs",
    description:
      "Build from source, architecture, and contributing.",
    content: (
      <>
        <h2>Building from Source</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          The active XeniOS source repository is public at{" "}
          <a
            href={EMULATOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {EMULATOR_GITHUB_URL}
          </a>
          . The website, compatibility tracker, and release metadata live in
          related repositories.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">{`git clone ${EMULATOR_GITHUB_URL}
cd XeniOS

# iOS debug build
./xb build --target_os=ios --config=debug

# Format code
./xb format`}</pre>
        </div>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Use the public repository for checkout, issues, and contributions.
          The build docs here stay focused on platform-specific notes for iOS.
        </p>

        <h2>Architecture Overview</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-text-primary">CPU</strong> — PowerPC to
            ARM64 JIT via Oaknut. Three-phase pipeline: PPC &rarr; HIR
            (Hardware-Independent IR) &rarr; native ARM64. On iOS, uses
            dual-mapped JIT memory with W^X enforcement. Requires a JIT helper
            (StikDebug); depending on iOS / iPadOS version and device,
            LocalDevVPN may also be required (see Getting Started).
          </li>
          <li>
            <strong className="text-text-primary">GPU</strong> — Xenos command
            processor with Metal backend. Two shader paths: SPIR-V &rarr;
            SPIRV-Cross &rarr; MSL (iOS default, controlled by{" "}
            <C>metal_use_spirvcross</C>), or DXBC &rarr; Metal Shader
            Converter (macOS only). Includes EDRAM render target emulation,
            texture cache with heap-backed allocation, and MetalFX upscaling.
          </li>
          <li>
            <strong className="text-text-primary">Audio</strong> — XMA decoded
            via FFmpeg with multiple decoder implementations (<C>old</C>,{" "}
            <C>new</C>, <C>master</C>). Output through SDL2 (CoreAudio on
            iOS). NEON runtime paths disabled on ARM64 for decode parity.
          </li>
          <li>
            <strong className="text-text-primary">Kernel</strong> — HLE of the
            Xbox 360 kernel (xboxkrnl) and XAM modules. Covers threading,
            memory management, I/O, content management, and user profiles.
          </li>
          <li>
            <strong className="text-text-primary">VFS</strong> — Virtual
            filesystem supporting ISO, XEX, ZAR, and XContent containers
            (STFS + SVOD/GOD). XContent detected via CON/LIVE/PIRS magic
            bytes, dispatched to StfsContainerDevice or SvodContainerDevice
            based on volume type.
          </li>
        </ul>

        <h2>iOS Target</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          The iOS app target is <C>xenia_edge</C> (bundle ID{" "}
          <C>com.xenia.xenia-edge-ios</C>). It links against: Metal, MetalKit,
          UIKit, GameController, CoreAudio, AudioToolbox, AVFoundation,
          CoreMotion, CoreHaptics, CoreBluetooth, and SDL2. The app requests
          the <C>com.apple.developer.kernel.increased-memory-limit</C>{" "}
          entitlement for large games.
        </p>

        <h2>Contributing</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          We welcome pull requests. Before starting a large change, open a
          discussion issue to align with the maintainers. All contributions
          should follow the existing code style — run <C>./xb format</C>{" "}
          before submitting.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">{`# Create a feature branch
git checkout -b feat/my-feature

# Build for iOS
./xb build --target_os=ios --config=debug

# Format code
./xb format

# Submit a pull request`}</pre>
        </div>
      </>
    ),
  },
};

const macDocs: Record<string, DocEntry> = {
  "getting-started": {
    title: "Getting Started",
    description: "Install and run XeniOS on macOS.",
    content: (
      <>
        <h2>Read First</h2>
        <div className="mb-6">
          <Callout type="warning">
            XeniOS for Mac requires{" "}
            <strong className="text-text-primary">macOS 15.0 or newer</strong>.
            Not every game runs yet, and performance and stability are still
            game-dependent. Treat current compatibility results as early and
            verify on your own hardware before assuming a title will work well.
            XeniOS is still alpha software, so do not expect a polished or
            perfect experience yet.
          </Callout>
        </div>

        <h2>Overview</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          XeniOS for Mac is shipped from the same repository and release stream
          as the iPhone/iPad build. Core emulator logic is shared across
          platforms, with platform-specific app layers where needed.
        </p>

        <h2>Install</h2>
        <ol className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-decimal pl-5">
          <li>
            Open the{" "}
            <Link
              href="/download/mac"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Mac download page
            </Link>
            .
          </li>
          <li>Download the latest macOS artifact from Releases.</li>
          <li>Open the downloaded file and move the app to Applications.</li>
          <li>
            If macOS blocks first launch, right-click the app and choose{" "}
            <strong className="text-text-primary">Open</strong> once.
          </li>
        </ol>

        <h2>Adding Games</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Use game dumps you legally own. Supported container/file behavior is
          largely shared with iOS builds, but title results remain
          game-dependent and unverified overall.
        </p>
      </>
    ),
  },
  settings: {
    title: "Settings Reference",
    description: "Shared emulator settings and Mac-specific notes.",
    content: (
      <>
        <h2>Shared Configuration Model</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Most emulator options are shared between iPhone/iPad and Mac because
          both builds use the same core codebase. Graphics, CPU, audio, and
          compatibility flags generally follow the same config keys.
        </p>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          For full option descriptions, use the iOS settings reference as the
          baseline:
        </p>
        <p className="mt-2 text-[15px] leading-relaxed">
          <Link
            href="/docs/ios/settings"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Open shared settings reference
          </Link>
        </p>
      </>
    ),
  },
  troubleshooting: {
    title: "Troubleshooting",
    description: "Fix common problems on macOS builds.",
    content: (
      <>
        <h2>App Doesn&apos;t Launch</h2>
        <ol className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-decimal pl-5">
          <li>Re-download the latest build from Releases.</li>
          <li>Move the app to Applications before first run.</li>
          <li>
            If blocked by Gatekeeper, right-click the app and choose Open once.
          </li>
          <li>Reboot and try again.</li>
        </ol>

        <h2>Game Performance Is Poor</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Performance is not fully validated yet. Try lower internal
          resolution, close background apps, and compare across builds to report
          regressions with clear reproduction steps.
        </p>

        <h2>Controller Issues</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          Re-pair or reconnect the controller and restart the app. Include your
          controller model in bug reports.
        </p>
      </>
    ),
  },
  "reporting-bugs": {
    title: "Reporting Bugs",
    description: "Submit actionable bug reports for macOS issues.",
    content: (
      <>
        <h2>Include This Information</h2>
        <ul className="mt-3 space-y-1.5 text-[15px] text-text-secondary leading-relaxed list-disc pl-5">
          <li>XeniOS version and commit hash.</li>
          <li>Mac model and macOS version.</li>
          <li>Game title and title ID.</li>
          <li>Steps to reproduce and expected vs actual behavior.</li>
        </ul>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          File issues on{" "}
          <a
            href={EMULATOR_GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            GitHub
          </a>
          .
        </p>
      </>
    ),
  },
  developer: {
    title: "Developer Docs",
    description: "Build and contribute to macOS targets in the unified repo.",
    content: (
      <>
        <h2>Single Repository Workflow</h2>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          iOS and Mac are built from one public repository at{" "}
          <a
            href={EMULATOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {EMULATOR_GITHUB_URL}
          </a>
          . Shared changes stay in common modules, with platform-specific code
          isolated to platform targets.
        </p>
        <div className="mt-4 rounded-lg bg-bg-surface-2/60 border border-border p-4">
          <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">{`git clone ${EMULATOR_GITHUB_URL}
cd XeniOS

# macOS debug build
./xb build --target_os=macos --config=debug

# Format code
./xb format`}</pre>
        </div>
      </>
    ),
  },
};

const iosSlugOrder = [
  "getting-started",
  "settings",
  "troubleshooting",
  "reporting-bugs",
  "developer",
];

const macSlugOrder = [
  "getting-started",
  "settings",
  "troubleshooting",
  "reporting-bugs",
  "developer",
];

type DocsPlatform = "ios" | "mac";

function parseDocRoute(slug: string[]) {
  const first = slug[0];
  const hasPlatformPrefix = first === "ios" || first === "mac";
  const platform: DocsPlatform = hasPlatformPrefix
    ? (first as DocsPlatform)
    : "ios";
  const pageParts = hasPlatformPrefix ? slug.slice(1) : slug;
  const pageSlug = pageParts.length > 0 ? pageParts.join("/") : "getting-started";
  const docsForPlatform = platform === "mac" ? macDocs : iosDocs;
  const slugOrder = platform === "mac" ? macSlugOrder : iosSlugOrder;
  const platformLabel = platform === "mac" ? "Mac" : "iPhone / iPad";
  const canonicalPath = `/docs/${platform}/${pageSlug}`;

  return { platform, platformLabel, pageSlug, docsForPlatform, slugOrder, canonicalPath };
}

export function generateStaticParams() {
  return [
    { slug: ["ios"] },
    { slug: ["mac"] },
    ...iosSlugOrder.map((slug) => ({ slug: [slug] })),
    ...iosSlugOrder.map((slug) => ({ slug: ["ios", slug] })),
    ...macSlugOrder.map((slug) => ({ slug: ["mac", slug] })),
  ];
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const route = parseDocRoute(slug);
    if (!route) {
      return {
        title: "Not Found",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const { docsForPlatform, pageSlug, canonicalPath, platformLabel } = route;
    const doc = docsForPlatform[pageSlug];
    if (!doc) {
      return {
        title: "Not Found",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    return withCanonical(
      {
        title: `${doc.title} (${platformLabel})`,
        description: doc.description,
      },
      canonicalPath
    );
  });
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const route = parseDocRoute(slug);
  if (!route) {
    notFound();
  }

  const { platform, pageSlug, docsForPlatform, slugOrder, canonicalPath } = route;
  const doc = docsForPlatform[pageSlug];

  if (!doc) {
    notFound();
  }

  const requestedPath = `/docs/${slug.join("/")}`;
  if (requestedPath !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const currentIndex = slugOrder.indexOf(pageSlug);
  const prevSlug = currentIndex > 0 ? slugOrder[currentIndex - 1] : null;
  const nextSlug =
    currentIndex < slugOrder.length - 1 ? slugOrder[currentIndex + 1] : null;
  const prevDoc = prevSlug ? docsForPlatform[prevSlug] : null;
  const nextDoc = nextSlug ? docsForPlatform[nextSlug] : null;
  const iosTargetSlug = iosDocs[pageSlug] ? pageSlug : "getting-started";
  const macTargetSlug = macDocs[pageSlug] ? pageSlug : "getting-started";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 max-w-3xl">
        <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
          <Link
            href={`/docs/ios/${iosTargetSlug}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              platform === "ios"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            iPhone / iPad
          </Link>
          <Link
            href={`/docs/mac/${macTargetSlug}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              platform === "mac"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Mac
          </Link>
        </div>
        <p className="text-sm text-text-secondary">
          One codebase, two builds: iPhone/iPad and Mac.
        </p>
      </div>

      <article className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {doc.title}
        </h1>
        <p className="mt-1 text-text-muted text-[15px]">{doc.description}</p>
        <hr className="mt-6 border-border" />
        <div className="mt-6 doc-content">{doc.content}</div>
      </article>

      {/* Prev / Next */}
      <nav className="mt-12 flex items-stretch gap-4 max-w-3xl">
        {prevDoc && prevSlug ? (
          <Link
            href={`/docs/${platform}/${prevSlug}`}
            className="group flex-1 rounded-lg border border-border p-4 transition-colors hover:border-accent/30"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Previous
            </span>
            <span className="mt-1 block text-[15px] font-medium text-text-primary group-hover:text-accent transition-colors">
              &larr; {prevDoc.title}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {nextDoc && nextSlug ? (
          <Link
            href={`/docs/${platform}/${nextSlug}`}
            className="group flex-1 rounded-lg border border-border p-4 text-right transition-colors hover:border-accent/30"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Next
            </span>
            <span className="mt-1 block text-[15px] font-medium text-text-primary group-hover:text-accent transition-colors">
              {nextDoc.title} &rarr;
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </div>
  );
}
