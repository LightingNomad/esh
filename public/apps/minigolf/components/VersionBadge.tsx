import version from "@/lib/version.json";

export default function VersionBadge() {
  const { shortSha, sha, date } = version;
  const label = shortSha === "unknown" ? "dev build" : `v${shortSha} · ${date}`;
  const content =
    sha === "unknown" ? (
      label
    ) : (
      <a
        href={`https://github.com/LightingNomad/esh/commit/${sha}`}
        target="_blank"
        rel="noreferrer"
        className="hover:underline"
      >
        {label}
      </a>
    );

  return <footer className="border-t border-black/10 px-4 py-2 text-center text-xs text-black/40">{content}</footer>;
}
