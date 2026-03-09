import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@/components/accordion";
import {
  DISCORD_URL,
  EMULATOR_GITHUB_ISSUES_URL,
  EMULATOR_GITHUB_URL,
  STIKDEBUG_RELEASES_URL,
  STIKDEBUG_UNIVERSAL_SCRIPT_URL,
  STIKDEBUG_URL,
  XENIA_CANARY_RELEASES_URL,
  XENIA_EDGE_RELEASES_URL,
} from "@/lib/constants";
import { withCanonical } from "@/lib/metadata";

export const metadata: Metadata = withCanonical(
  {
    title: "FAQ",
    description:
      "Frequently asked questions about XeniOS on iPhone, iPad, and Mac.",
  },
  "/faq"
);

const project = [
  {
    title: "What is XeniOS?",
    content: (
      <p>
        XeniOS is an experimental Apple-focused fork of Xenia, currently based on
        Xenia Edge. It is the fast-moving branch used to develop, test, and ship
        the iPhone, iPad, and Mac experience while also carrying platform
        changes that benefit ARM64 Windows, Linux, and Android.
      </p>
    ),
  },
  {
    title: "Why does this fork exist?",
    content: (
      <p>
        Upstream Xenia is not structured for fast iteration on Apple packaging,
        releases, documentation, compatibility reporting, and user experience.
        XeniOS exists so those pieces can move faster in one product-focused
        repository, with useful technical improvements intended to flow back
        upstream over time.
      </p>
    ),
  },
  {
    title: "Which platforms are the current focus?",
    content: (
      <div className="space-y-2">
        <p>
          Current published releases focus on iPhone, iPad, and Mac, including
          both Apple Silicon and Intel Mac builds.
        </p>
        <p>
          If you are looking for Windows or Linux builds, use{" "}
          <a
            href={XENIA_CANARY_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            Xenia-Canary
          </a>{" "}
          as the stable desktop path, especially on Windows, or{" "}
          <a
            href={XENIA_EDGE_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            Xenia-Edge
          </a>
          {" "}if you need the branch with better Linux support.
        </p>
      </div>
    ),
  },
  {
    title: "Is XeniOS free and open source?",
    content: (
      <p>
        Yes. XeniOS is open source, and the public repository is{" "}
        <a
          href={EMULATOR_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          {EMULATOR_GITHUB_URL}
        </a>
        .
      </p>
    ),
  },
  {
    title: "What stage of development is XeniOS in?",
    content: (
      <p>
        XeniOS is pre-release and experimental. Expect crashes, graphical
        glitches, missing features, and major game-to-game variance while core
        behavior is still being validated. Do not expect a polished or perfect
        experience yet.
      </p>
    ),
  },
  {
    title: "Where can I report bugs or request features?",
    content: (
      <p>
        Open an issue on the{" "}
        <a
          href={EMULATOR_GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          XeniOS GitHub issue tracker
        </a>{" "}
        for emulator bugs, feature requests, and tracked work. For setup help or
        quick questions, use the{" "}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          community Discord server
        </a>
        .
      </p>
    ),
  },
  {
    title: "How can I contribute to the project?",
    content: (
      <p>
        Contributions are welcome in code, documentation, bug reports, feature
        requests, and compatibility reporting. Start with the public repository,
        check open issues, and coordinate larger work in Discord before diving in.
      </p>
    ),
  },
];

const ios = [
  {
    title: "iPhone / iPad: How do I install XeniOS?",
    content: (
      <div className="space-y-2">
        <p>
          The current supported public install path is manual IPA sideloading
          through SideStore.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-text-primary">SideStore</strong> — add the
            XeniOS IPA manually and refresh it every 7 days on free Apple IDs.
          </li>
        </ul>
        <p>
          LiveContainer is currently untested on iOS 26, though users have
          reported it working on iOS 18. Use it at your own risk. If you try
          it, expect to need the{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
            com.apple.developer.kernel.increased-memory-limit
          </code>{" "}
          entitlement when signing it.
        </p>
        <p>
          After installation, complete JIT setup before launching games. If you
          need help with SideStore or the first install pass, use{" "}
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
    title: "iPhone / iPad: What OS and hardware do I need?",
    content: (
      <p>
        The lowest tested baseline right now is iOS / iPadOS 18.0 on A16-class
        hardware. Older versions or older chips may work, but they are currently
        untested and should not be treated as validated. Do not upgrade to
        iOS / iPadOS 26.4 beta right now.
      </p>
    ),
  },
  {
    title: "iPhone / iPad: What is JIT, and why do I need it?",
    content: (
      <div className="space-y-2">
        <p>
          JIT is the permission the emulator needs to execute translated game
          code. Without JIT, XeniOS can open, but games will not start.
        </p>
        <p>
          Use{" "}
          <a
            href={STIKDEBUG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            StikDebug
          </a>{" "}
          to enable JIT. Depending on your iOS / iPadOS version and device, this
          may also require <strong className="text-text-primary">LocalDevVPN</strong>.
          Check the{" "}
          <a
            href="https://docs.sidestore.io/docs/advanced/jit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            latest SideStore JIT guide
          </a>{" "}
          before assuming a setup will work unchanged.
        </p>
        <p>
          In StikDebug, you must also assign the bundled{" "}
          <strong className="text-text-primary">Amethyst-MeloNX.js</strong> or{" "}
          <strong className="text-text-primary">universal.js</strong> script to
          XeniOS. If you do not see either script in the app, update to{" "}
          <a
            href={STIKDEBUG_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            StikDebug releases
          </a>{" "}
          or download{" "}
          <a
            href={STIKDEBUG_UNIVERSAL_SCRIPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            universal.js
          </a>{" "}
          directly. Check the{" "}
          <a
            href={STIKDEBUG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
          >
            StikDebug repo
          </a>{" "}
          for more information.
        </p>
      </div>
    ),
  },
  {
    title: "iPhone / iPad: What devices are supported?",
    content: (
      <p>
        XeniOS targets ARM64 iPhone and iPad hardware with Metal support.
        Practical results vary heavily by chip, available memory, and the game
        being tested. The app uses the{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
          increased-memory-limit
        </code>{" "}
        entitlement on supported installs.
      </p>
    ),
  },
];

const mac = [
  {
    title: "Mac: Is this a separate project from iPhone / iPad?",
    content: (
      <p>
        No. Mac and iPhone/iPad releases are built from one shared XeniOS
        codebase and repository. Platform-specific code exists only where needed.
      </p>
    ),
  },
  {
    title: "Mac: How do I install XeniOS?",
    content: (
      <p>
        Go to the download page or release assets, download the latest macOS
        build, open it, then move the app to Applications. If Gatekeeper blocks
        first launch, open the app once, then go to{" "}
        <strong className="text-text-primary">
          System Settings &rarr; Privacy &amp; Security
        </strong>{" "}
        and use <strong className="text-text-primary">Open Anyway</strong>.
      </p>
    ),
  },
  {
    title: "Mac: Which Macs and macOS versions are supported?",
    content: (
      <p>
        XeniOS for Mac currently requires macOS 15.0 or newer. Both Apple
        Silicon (M-series) and Intel Mac builds are supported, with separate
        downloads published when available.
      </p>
    ),
  },
  {
    title: "Mac: Are compatibility and performance guaranteed?",
    content: (
      <p>
        No. Current Mac results still vary by game, scene, hardware, and build.
        Treat compatibility and FPS as in-progress until broader validation is
        published.
      </p>
    ),
  },
];

const performance = [
  {
    title: "What frame rates can I expect?",
    content: (
      <p>
        Performance varies significantly by game, scene, device class, and
        build. The{" "}
        <Link
          href="/compatibility"
          className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
        >
          compatibility list
        </Link>{" "}
        includes a performance rating for each tested game: Great (near full
        speed), OK (playable with drops), or Poor (significant issues).
      </p>
    ),
  },
  {
    title: "How can I improve performance?",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Close background apps to free up RAM and thermal headroom.</li>
        <li>Lower internal resolution to reduce GPU load where supported.</li>
        <li>Use per-game config overrides to tune settings for specific titles.</li>
        <li>Keep the device cool. Thermal throttling will reduce performance.</li>
        <li>Try the latest build. Performance behavior can change between revisions.</li>
      </ul>
    ),
  },
  {
    title: "Why does the emulator stutter at the start of a game?",
    content: (
      <p>
        Initial stuttering is usually shader compilation. Xbox 360 shaders are
        translated and cached on first use, so subsequent launches of the same
        game should be smoother.
      </p>
    ),
  },
  {
    title: "Does XeniOS support multithreaded emulation?",
    content: (
      <p>
        Yes. XeniOS distributes emulation work across multiple CPU cores where
        possible, including separate threads for major subsystems and the three
        Xbox 360 CPU cores.
      </p>
    ),
  },
  {
    title: "My device gets very hot. Is this normal?",
    content: (
      <p>
        Xbox 360 emulation is extremely demanding. Heat buildup is normal during
        gameplay, and extended sessions under thermal throttling will degrade
        performance.
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
        for community-submitted reports. Results are device- and build-specific,
        so treat each report as evidence, not a blanket guarantee.
      </p>
    ),
  },
  {
    title: "What do the compatibility statuses mean?",
    content: (
      <div className="space-y-2">
        <p>
          Compatibility status is derived from reports on the current release or
          tracked activity. Results can vary by platform and device.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-text-primary">Playable</strong> — reported as
            playthrough-quality on the tested devices without significant issues.
          </li>
          <li>
            <strong className="text-text-primary">In-Game</strong> — gameplay is
            reachable, but significant bugs, glitches, or performance problems
            remain.
          </li>
          <li>
            <strong className="text-text-primary">Intro</strong> — gets past the
            title screen or intro, but crashes or hangs before gameplay.
          </li>
          <li>
            <strong className="text-text-primary">Loads</strong> — starts loading
            but does not reach menus or gameplay.
          </li>
          <li>
            <strong className="text-text-primary">Nothing</strong> — crashes
            immediately on launch or produces no useful output.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "What file formats are supported?",
    content: (
      <p>
        Supported formats include GOD (Games on Demand) folders,{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.iso</code>{" "}
        disc images,{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.xex</code>{" "}
        executables,{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.zar</code>{" "}
        archives, and STFS/XContent packages such as{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.con</code>,{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.live</code>,
        and{" "}
        <code className="text-text-primary bg-bg-surface-2 px-1 rounded">.pirs</code>.
      </p>
    ),
  },
  {
    title: "How do I get my game files onto the device?",
    content: (
      <div className="space-y-2">
        <p>
          You must dump games from Xbox 360 discs or digital purchases that you
          legally own. XeniOS does not include, provide, or link to any game
          files.
        </p>
        <p>
          On iPhone and iPad, transfer dumps using the Files app, AirDrop, USB
          file sharing through Finder, or the iOS document picker. XeniOS scans
          its Documents directory for supported titles on launch.
        </p>
      </div>
    ),
  },
  {
    title: "How do I dump my own games?",
    content: (
      <div className="space-y-2">
        <p>
          You need an Xbox 360 console and the original game disc or a digital
          purchase linked to your account. No modding is required.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Install the game to the console&apos;s hard drive.</li>
          <li>
            Copy the installed game to a FAT32-formatted USB drive via{" "}
            <strong className="text-text-primary">
              Settings &rarr; System &rarr; Storage
            </strong>
            .
          </li>
          <li>Move the copied files to your Apple device or Mac.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Do I need a modded console to dump games?",
    content: (
      <p>
        No. You can dump games from a stock, unmodified Xbox 360 console. No
        homebrew, JTAG, or RGH modifications are required.
      </p>
    ),
  },
  {
    title: "How do I install Title Updates (TUs)?",
    content: (
      <div className="space-y-2">
        <p>
          Place the update file in the standard Xbox 360 content path:
        </p>
        <p>
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
            content/0000000000000000/[Title ID]/000B0000/[update file]
          </code>
        </p>
        <p>
          XeniOS will automatically load the Title Update when launching the
          game if the file structure is correct.
        </p>
      </div>
    ),
  },
  {
    title: "Are game patches supported on iPhone / iPad?",
    content: (
      <div className="space-y-2">
        <p>
          Yes. Game patches are supported on iPhone and iPad, but there is no
          built-in UI for them yet.
        </p>
        <p>
          Copy the{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
            patches
          </code>{" "}
          folder that contains your patch files into the main{" "}
          <code className="text-text-primary bg-bg-surface-2 px-1 rounded">
            XeniOS.app
          </code>{" "}
          folder, then edit the patch files manually in the Files app or an
          external text editor.
        </p>
      </div>
    ),
  },
  {
    title: "Can I play Xbox Live Arcade (XBLA) games?",
    content: (
      <p>
        XBLA packages are supported by the loader, but actual playability remains
        title-dependent and unverified.
      </p>
    ),
  },
  {
    title: "Are Xbox 360 saves supported?",
    content: (
      <p>
        Save behavior depends on the title and current emulator stability. There
        is no broad save-compatibility guarantee yet.
      </p>
    ),
  },
  {
    title: "Do I need BIOS or firmware files?",
    content: (
      <p>
        No. XeniOS uses high-level emulation and does not require dumped BIOS or
        firmware files.
      </p>
    ),
  },
];

const controllers = [
  {
    title: "What controllers are supported?",
    content: (
      <div className="space-y-2">
        <p>
          XeniOS supports up to 4 controllers simultaneously across Apple
          platforms. Supported controllers include:
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
        No. There are currently no touchscreen gameplay controls. Touch input
        is for launcher and settings UI navigation only, so you need a
        supported controller to play.
      </p>
    ),
  },
  {
    title: "How do I connect a Bluetooth controller?",
    content: (
      <p>
        Put the controller into pairing mode, then connect it from Apple system
        Bluetooth settings. XeniOS should detect it automatically once paired.
      </p>
    ),
  },
  {
    title: "Can I remap buttons?",
    content: (
      <p>
        XeniOS does not yet include a built-in remapping UI. On iPhone and iPad,
        you can use system controller remapping in{" "}
        <strong className="text-text-primary">
          Settings &rarr; General &rarr; Game Controller
        </strong>
        . A native remapping feature is planned.
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
        We do not provide, host, or link to game downloads. You must dump games
        from discs or digital purchases that you legally own. Piracy is not
        supported or condoned by the XeniOS project.
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
    title: "Can I use Xbox Live services?",
    content: (
      <p>
        Xbox Live is not an officially supported feature. Some networking
        plumbing exists in the emulator stack, but sign-in and service behavior
        remain unverified. Do not rely on real accounts.
      </p>
    ),
  },
];

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

export default function FAQPage() {
  return (
    <div>
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            FAQ
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            One project, one FAQ, with platform-specific answers grouped below.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-3xl">
        <p className="text-[15px] leading-relaxed text-text-secondary">
          XeniOS is an experimental Apple-focused fork of Xenia. This page
          combines the shared project answers with platform-specific questions
          for iPhone, iPad, and Mac in one place. Current published releases
          focus on Apple platforms, while the broader project also carries
          platform changes intended to benefit ARM64 Windows, Linux, and
          Android over time.
        </p>
      </div>

        <div className="mt-10 max-w-3xl space-y-10">
          <Category id="project" heading="Project" items={project} />
          <Category id="ios" heading="iPhone / iPad" items={ios} />
          <Category id="mac" heading="Mac" items={mac} />
          <Category id="performance" heading="Performance" items={performance} />
          <Category id="games" heading="Games & Compatibility" items={games} />
          <Category id="controllers" heading="Controllers" items={controllers} />
          <Category id="legal" heading="Legal" items={legal} />
        </div>
      </div>
    </div>
  );
}
