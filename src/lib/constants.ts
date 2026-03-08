export const BUILD_VERSION = "N/A";
export const BUILD_COMMIT = "N/A";
export const BUILD_DATE = "N/A";

export const WEBSITE_GITHUB_URL = "https://github.com/xenios-jp/xenios.jp";
export const WEBSITE_GITHUB_ISSUES_URL = `${WEBSITE_GITHUB_URL}/issues`;
export const EMULATOR_GITHUB_URL = "https://github.com/xenios-jp/XeniOS";
export const EMULATOR_GITHUB_RELEASES_URL = `${EMULATOR_GITHUB_URL}/releases`;
export const EMULATOR_GITHUB_ISSUES_URL = `${EMULATOR_GITHUB_URL}/issues`;
export const EMULATOR_GITHUB_COMPATIBILITY_REPORT_URL = `${EMULATOR_GITHUB_ISSUES_URL}/new?template=compatibility_report.yml`;
export const COMPATIBILITY_TRACKER_GITHUB_URL =
  "https://github.com/xenios-jp/game-compatibility";
export const COMPATIBILITY_TRACKER_GITHUB_ISSUES_URL =
  `${COMPATIBILITY_TRACKER_GITHUB_URL}/issues`;
export const COMPATIBILITY_TRACKER_REPORT_URL =
  `${COMPATIBILITY_TRACKER_GITHUB_ISSUES_URL}/new?template=compatibility_report.yml`;

export const DISCORD_URL = "https://discord.gg/QwcTtNKTGf";
export const KOFI_URL = "https://ko-fi.com/xenios";
export const STIKDEBUG_URL = "https://github.com/StephenDev0/StikDebug";
export const STIKDEBUG_RELEASES_URL = `${STIKDEBUG_URL}/releases`;
export const STIKDEBUG_UNIVERSAL_SCRIPT_URL =
  `${STIKDEBUG_URL}/blob/main/StikJIT/Scripts/universal.js`;
export const SIDESTORE_JIT_GUIDE_URL = "https://docs.sidestore.io/docs/advanced/jit";
export const LOCALDEVVPN_APPSTORE_URL =
  "https://apps.apple.com/us/app/localdevvpn/id6755608044";

export const XENIA_UPSTREAM_OWNER = "xenia-project";
export const XENIA_UPSTREAM_REPO_URL = `https://github.com/${XENIA_UPSTREAM_OWNER}`;
export const XENIA_UPSTREAM_LICENSE_URL = `${XENIA_UPSTREAM_REPO_URL}/xenia/blob/master/LICENSE`;
export const XENIA_CANARY_REPO_URL = "https://github.com/xenia-canary/xenia-canary";
export const XENIA_CANARY_RELEASES_URL = `${XENIA_CANARY_REPO_URL}/releases`;
export const XENIA_EDGE_REPO_URL = "https://github.com/has207/xenia-edge";
export const XENIA_EDGE_RELEASES_URL = `${XENIA_EDGE_REPO_URL}/releases`;

export const XENIA_REPOS_FOR_CREDITS = [
  {
    owner: "xenia-project",
    slug: "xenia",
    label: "xenia (master)",
    url: "https://github.com/xenia-project/xenia",
  },
  {
    owner: "xenia-canary",
    slug: "xenia-canary",
    label: "xenia-canary",
    url: "https://github.com/xenia-canary/xenia-canary",
  },
  {
    owner: "has207",
    slug: "xenia-edge",
    label: "xenia-edge",
    url: "https://github.com/has207/xenia-edge",
  },
  {
    owner: "wmarti",
    slug: "xenia-mac",
    label: "xenia-mac",
    url: "https://github.com/wmarti/xenia-mac",
    filterMode: "owner-only",
  },
] as const;
