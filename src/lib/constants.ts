export const BUILD_VERSION = "v0.1.0-alpha";
export const BUILD_COMMIT = "abc1234";
export const BUILD_DATE = "Feb 2026";

export const WEBSITE_GITHUB_URL = "https://github.com/xenios-jp/xenios.jp";
export const EMULATOR_GITHUB_URL = "https://github.com/xenios-jp/XeniOS";
export const EMULATOR_GITHUB_RELEASES_URL = `${EMULATOR_GITHUB_URL}/releases`;
export const EMULATOR_GITHUB_ISSUES_URL = `${EMULATOR_GITHUB_URL}/issues`;
export const EMULATOR_GITHUB_COMPATIBILITY_REPORT_URL = `${EMULATOR_GITHUB_ISSUES_URL}/new?template=compatibility_report.yml`;

export const DISCORD_URL = "https://discord.gg/QwcTtNKTGf";
export const KOFI_URL = "https://ko-fi.com/xenios";

export const XENIA_UPSTREAM_OWNER = "xenia-project";
export const XENIA_UPSTREAM_REPO_URL = `https://github.com/${XENIA_UPSTREAM_OWNER}`;
export const XENIA_UPSTREAM_LICENSE_URL = `${XENIA_UPSTREAM_REPO_URL}/xenia/blob/master/LICENSE`;
export const XENIA_UPSTREAM_LICENSE_TEXT_URL = `https://raw.githubusercontent.com/${XENIA_UPSTREAM_OWNER}/xenia/master/LICENSE`;

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
