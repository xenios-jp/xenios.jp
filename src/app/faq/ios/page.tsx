import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@/components/accordion";
import { DISCORD_URL, WEBSITE_GITHUB_ISSUES_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about XeniOS, the iOS port of Xenia — the Xbox 360 Emulation Research Project. Learn about installation, performance, game compatibility, controller support, and more.",
};

/* ------------------------------------------------------------------ */
/*  FAQ data organised by category                                     */
/* ------------------------------------------------------------------ */

const general = [
  {
    title: "What is XeniOS?",
    content: (
      <p>
        XeniOS is the iOS port of Xenia, the Xbox 360 Emulation Research
        Project, based on Xenia Edge (a fork of Xenia Canary). It is a C++
        emulator with a Metal GPU backend and ARM64 JIT CPU backend. The iOS
        UI layer uses UIKit bridged from C++. It brings Xenia&rsquo;s
        emulation capabilities to iPhone and iPad, translating Xbox 360
        system calls and rendering graphics through Apple&rsquo;s Metal API.
      </p>
    ),
  },
  {
    title: "Is XeniOS free?",
    content: (
      <p>
        Yes. Like the upstream Xenia project, XeniOS is open source.
      </p>
    ),
  },
  {
    title: "What stage of development is XeniOS in?",
    content: (
      <p>
        XeniOS is pre-release and experimental. Expect crashes, graphical
        glitches, and missing features while core functionality is still being
        validated.
      </p>
    ),
  },
  {
    title: "Where can I report bugs or request features?",
    content: (
      <p>
        Open an issue on the{" "}
        <a
          href={WEBSITE_GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          GitHub repository
        </a>{" "}
        for bugs, feature requests, and tracked work items. For support or
        setup help, use the{" "}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          community Discord server
        </a>
        . Please include your device model, iOS version, game title, and
        reproduction steps.
      </p>
    ),
  },
  {
    title: "How can I contribute to the project?",
    content: (
      <p>
        Contributions are welcome in code, documentation, bug reports, feature
        requests, and compatibility reports. Check the contributing guide on
        GitHub for details.
      </p>
    ),
  },
];

const installation = [
  {
    title: "How do I install XeniOS on my device?",
    content: (
      <div className="space-y-2">
        <p>
          The current supported public install path is manual IPA sideloading
          through SideStore.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-text-primary">SideStore</strong> &mdash; add
            the XeniOS IPA manually and refresh it every 7 days on free Apple
            IDs.
          </li>
        </ul>
        <p>
          After installation, complete JIT setup before launching games.
          If you need help with SideStore or the first install pass, use{" "}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            Discord
          </a>
          .
        </p>
      </div>
    ),
  },
  {
    title: "What iOS version do I need?",
    content: (
      <p>
        The lowest tested version right now is iOS / iPadOS 18.0. Builds may
        also work on 17.x or 16.x, but those versions are currently untested
        and should not be treated as validated yet.
      </p>
    ),
  },
  {
    title: "What is JIT, and why do I need it?",
    content: (
      <div className="space-y-2">
        <p>
          JIT is the permission the emulator needs to execute translated game
          code. Without JIT, XeniOS can open, but games won&apos;t start.
        </p>
        <p>
          Use{" "}
          <a
            href="https://github.com/StephenDev0/StikDebug"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            StikDebug
          </a>{" "}
          to enable JIT. Depending on your iOS / iPadOS version and device,
          this may also require <strong className="text-text-primary">LocalDevVPN</strong>.
          Current public guidance covers normal StikDebug flows on 17.4-18.x,
          older 17.0-17.3 setups that may need tools such as SideJITServer, and
          iOS 26 setups that are more version- and device-sensitive. Check the{" "}
          <a
            href="https://docs.sidestore.io/docs/advanced/jit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            latest SideStore JIT guide
          </a>{" "}
          before assuming a setup will work unchanged. If you are blocked on
          JIT setup, use{" "}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            Discord
          </a>{" "}
          for help.
        </p>
      </div>
    ),
  },
  {
    title: "What devices are supported?",
    content: (
      <p>
        XeniOS targets ARM64 iPhone and iPad hardware with Metal support.
        Practical results vary heavily by chip, available memory, and the game
        being tested, and broader device validation is still in progress. The
        app uses the{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
          increased-memory-limit
        </code>{" "}
        entitlement on supported installs.
      </p>
    ),
  },
  {
    title: "How do I get game files onto my device?",
    content: (
      <div className="space-y-2">
        <p>
          You must dump games from Xbox 360 discs or digital purchases
          that you legally own. XeniOS does not include, provide, or link to
          any game files. Downloading games you do not own is piracy and is
          illegal. See <em>&ldquo;How do I dump my own games?&rdquo;</em>{" "}
          below for step-by-step instructions.
        </p>
        <p>
          Transfer dumped files to the XeniOS documents directory via the
          Files app, AirDrop, or USB file sharing through Finder. Supported
          formats:{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.iso</code> disc images,{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.xex</code> executables,{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.zar</code> archives,{" "}
          GOD (Games on Demand) containers, and STFS content packages (XBLA
          titles).
        </p>
      </div>
    ),
  },
  {
    title: "Do I need to install BIOS or firmware files?",
    content: (
      <p>
        XeniOS uses high-level emulation and does not require dumped BIOS or
        firmware files. All necessary system functions are reimplemented in
        software.
      </p>
    ),
  },
];

const performance = [
  {
    title: "What frame rates can I expect?",
    content: (
      <p>
        Performance varies significantly by game, scene, and device. The{" "}
        <Link
          href="/compatibility"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          compatibility list
        </Link>{" "}
        includes a performance rating for each tested game: Great (near full
        speed), OK (playable with drops), or Poor (significant issues).
        M-series iPads and newer iPhones generally perform best.
      </p>
    ),
  },
  {
    title: "How can I improve performance?",
    content: (
      <div className="space-y-2">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Close all background apps to free up RAM and thermal headroom.
          </li>
          <li>
            Lower the internal display resolution setting to reduce GPU load.
          </li>
          <li>
            Enable per-game config overrides to tune settings for specific
            titles.
          </li>
          <li>
            Keep your device cool &mdash; sustained heat causes iOS to throttle
            the CPU and GPU.
          </li>
          <li>
            Try the latest build; performance behavior can change between
            revisions.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Why does the emulator stutter at the start of a game?",
    content: (
      <p>
        Initial stuttering is usually caused by shader compilation. Xbox 360
        GPU shaders are translated from Xenos microcode to SPIR-V, then
        cross-compiled to Metal Shading Language (MSL) via SPIRV-Cross. This
        translation happens on-the-fly the first time each shader is
        encountered. XeniOS caches the compiled MSL to disk, so subsequent
        launches of the same game will be much smoother.
      </p>
    ),
  },
  {
    title: "Does XeniOS support multithreaded emulation?",
    content: (
      <p>
        Yes. XeniOS distributes emulation work across multiple CPU cores where
        possible, including separate threads for the GPU command processor,
        audio, and the three Xbox 360 CPU cores. Performance scales with the
        number of available high-performance cores on your device.
      </p>
    ),
  },
  {
    title: "My device gets very hot. Is this normal?",
    content: (
      <p>
        Xbox 360 emulation is extremely demanding. It is normal for your device
        to warm up significantly during gameplay. If the device becomes
        uncomfortably hot, take a break to let it cool down. Extended sessions
        under thermal throttling will degrade performance.
      </p>
    ),
  },
];

const games = [
  {
    title: "How do I know if a game is compatible?",
    content: (
      <p>
        Check the{" "}
        <Link
          href="/compatibility"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          compatibility list
        </Link>{" "}
        for community-submitted reports. Each game page shows its current
        status, performance tier, and tested devices. Results vary by device
        and build — if your game isn&apos;t listed, try it and submit a report.
      </p>
    ),
  },
  {
    title: "What do the compatibility statuses mean?",
    content: (
      <div className="space-y-2">
        <p>
          Each game on the compatibility list has a status based on community
          reports. These reflect the best result reported so far — your
          experience may differ depending on device, OS version, and build:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-text-primary">Playable</strong> &mdash; the game
            can be completed or played for extended sessions with minor or no
            issues.
          </li>
          <li>
            <strong className="text-text-primary">In-Game</strong> &mdash; gameplay
            is reachable but there are significant bugs, glitches, or
            performance problems.
          </li>
          <li>
            <strong className="text-text-primary">Intro</strong> &mdash; the game
            gets past the title screen or intro sequence but crashes or hangs
            before gameplay.
          </li>
          <li>
            <strong className="text-text-primary">Loads</strong> &mdash; the game
            starts loading but does not reach menus or gameplay.
          </li>
          <li>
            <strong className="text-text-primary">Nothing</strong> &mdash; the
            game crashes immediately on launch or produces no output.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Can I play Xbox Live Arcade (XBLA) games?",
    content: (
      <p>
        XBLA packages (STFS/XContent) are supported by the loader, but actual
        playability remains title-dependent and unverified at this time.
      </p>
    ),
  },
  {
    title: "Are Xbox 360 game saves supported?",
    content: (
      <p>
        Save behavior depends on the title and current emulator stability.
        There is no broad save-compatibility guarantee yet.
      </p>
    ),
  },
  {
    title: "Can I use games from other regions?",
    content: (
      <p>
        Region behavior is not fully documented yet. There is no dedicated
        region-lock setting in the iOS UI, but title behavior can still vary by
        game and dump.
      </p>
    ),
  },
  {
    title: "How do I dump my own games?",
    content: (
      <div className="space-y-2">
        <p>
          You need an Xbox 360 console and the original game disc or a
          digital purchase linked to your account. No modding is required —
          a stock, unmodified console works fine.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Install the game to the console&apos;s hard drive (disc games:
            install from disc; digital games: download from your purchase
            history).
          </li>
          <li>
            Copy the installed game to a FAT32-formatted USB drive via{" "}
            <strong className="text-text-primary">
              Settings &rarr; System &rarr; Storage
            </strong>
            .
          </li>
          <li>
            Transfer the files to your device via the Files app, AirDrop, or
            USB file sharing.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Do I need a modded console to dump games?",
    content: (
      <p>
        No. You can dump games from a stock, unmodified Xbox 360 console.
        No homebrew, JTAG, or RGH modifications are needed.
      </p>
    ),
  },
  {
    title: "How do I install Title Updates (TUs)?",
    content: (
      <div className="space-y-2">
        <p>
          Title Updates patch games with bug fixes and additional content.
          To install a TU, place the update file in the correct content
          directory structure:
        </p>
        <p>
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
            content/0000000000000000/[Title ID]/000B0000/[update file]
          </code>
        </p>
        <p>
          The Title ID is the 8-character hex identifier for the game (visible
          on each game&apos;s compatibility page). XeniOS will automatically
          load the update when launching the game.
        </p>
      </div>
    ),
  },
];

const controllers = [
  {
    title: "What controllers are supported?",
    content: (
      <div className="space-y-2">
        <p>
          XeniOS supports up to 4 controllers simultaneously. Controllers are
          handled via SDL2, which uses Apple&rsquo;s GameController framework on
          iOS. Compatible controllers include:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Xbox Wireless Controller (Bluetooth models)</li>
          <li>PlayStation DualSense and DualShock 4</li>
          <li>Nintendo Switch Pro Controller</li>
          <li>MFi-certified controllers</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Can I use on-screen touch controls?",
    content: (
      <p>
        Gameplay touch controls are planned, but not currently implemented.
        Touch input is for launcher/settings UI navigation only.
      </p>
    ),
  },
  {
    title: "How do I connect a Bluetooth controller?",
    content: (
      <div className="space-y-2">
        <p>
          Put your controller into pairing mode, then go to{" "}
          <strong className="text-text-primary">
            iOS Settings &rarr; Bluetooth
          </strong>{" "}
          and connect it. XeniOS will automatically detect the controller once
          paired. No additional configuration inside the app is required.
        </p>
      </div>
    ),
  },
  {
    title: "Can I remap buttons?",
    content: (
      <p>
        XeniOS does not yet include a built-in remapping UI, but you can use the
        system-level controller remapping in{" "}
        <strong className="text-text-primary">
          iOS Settings &rarr; General &rarr; Game Controller
        </strong>
        . A native remapping feature is planned for a future release.
      </p>
    ),
  },
];

const legal = [
  {
    title: "Is Xbox 360 emulation legal?",
    content: (
      <p>
        Laws vary by jurisdiction, and this project does not provide legal
        advice. You are responsible for complying with local laws and rights
        ownership requirements.
      </p>
    ),
  },
  {
    title: "Where can I download games?",
    content: (
      <p>
        We do not provide, host, or link to game downloads. You must dump
        games from discs or digital purchases that you legally own. Piracy
        is not supported or condoned by the XeniOS project.
      </p>
    ),
  },
  {
    title: "Does XeniOS use any Microsoft code?",
    content: (
      <p>
        The project is based on the Xenia research codebase and is intended to
        be an independent implementation. For licensing and provenance details,
        refer to the repository license and source history.
      </p>
    ),
  },
  {
    title: "Can I get banned from Xbox Live for using XeniOS?",
    content: (
      <p>
        Xbox Live services are not an officially supported feature. Some
        networking plumbing exists in the emulator stack, but Xbox Live
        sign-in/service behavior is unverified. Do not rely on real accounts.
      </p>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Category wrapper                                                   */
/* ------------------------------------------------------------------ */

interface CategoryProps {
  id: string;
  heading: string;
  items: { title: string; content: React.ReactNode }[];
}

function Category({ id, heading, items }: CategoryProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-text-primary">{heading}</h2>
      <div className="mt-3">
        <Accordion items={items} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FAQPage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            FAQ
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            XeniOS for iPhone and iPad.
          </p>
        </div>
      </section>

      {/* Platform Switch */}
      <section className="py-4 border-b border-border bg-bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/faq/ios"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/faq/mac"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Mac
              </Link>
            </div>
            <p className="text-sm text-text-secondary">
              One codebase, two builds: iPhone/iPad and Mac.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="max-w-3xl space-y-10">
          <Category id="general" heading="General" items={general} />
          <Category
            id="installation"
            heading="Installation"
            items={installation}
          />
          <Category
            id="performance"
            heading="Performance"
            items={performance}
          />
          <Category id="games" heading="Games" items={games} />
          <Category
            id="controllers"
            heading="Controllers"
            items={controllers}
          />
          <Category id="legal" heading="Legal" items={legal} />
        </div>
      </div>
    </div>
  );
}
