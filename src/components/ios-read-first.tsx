import {
  LOCALDEVVPN_APPSTORE_URL,
  SIDESTORE_JIT_GUIDE_URL,
  STIKDEBUG_URL,
} from "@/lib/constants";

type IosReadFirstTone = "primary" | "secondary";

interface IosReadFirstProps {
  tone?: IosReadFirstTone;
}

export function IosReadFirst({ tone = "primary" }: IosReadFirstProps) {
  const textClass =
    tone === "primary"
      ? "text-[15px] leading-relaxed text-text-primary"
      : "text-[15px] leading-relaxed text-text-secondary";
  const listClass =
    tone === "primary"
      ? "mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-text-primary marker:text-accent"
      : "mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-text-secondary marker:text-accent";
  const linkClass =
    tone === "primary"
      ? "text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
      : "text-accent underline underline-offset-2 hover:text-accent-hover font-semibold";

  return (
    <>
      <p className={textClass}>
        Installing the app and running games are separate steps. XeniOS can
        install successfully but games will not start until JIT is enabled.
      </p>
      <ul className={listClass}>
        <li>
          <strong>Install path:</strong> Use SideStore for the current
          documented iPhone and iPad install flow.
        </li>
        <li>
          <strong>JIT:</strong> Enable JIT with{" "}
          <a
            href={STIKDEBUG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            StikDebug
          </a>
          . Depending on your iOS / iPadOS version and device, you may also
          need{" "}
          <a
            href={LOCALDEVVPN_APPSTORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            LocalDevVPN
          </a>
          . Current public guidance covers normal StikDebug flows on 17.4-18.x,
          older 17.0-17.3 setups that may need alternatives such as
          SideJITServer, and iOS 26 setups that are more version- and
          device-sensitive. Check the{" "}
          <a
            href={SIDESTORE_JIT_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            latest SideStore JIT guide
          </a>{" "}
          before troubleshooting.
        </li>
      </ul>
      <p className={`mt-3 ${textClass}`}>
        XeniOS is still alpha software. Expect crashes, rough edges, and
        title-specific problems. Do not expect a polished or fully stable
        experience yet, even if installation succeeds.
      </p>
    </>
  );
}
