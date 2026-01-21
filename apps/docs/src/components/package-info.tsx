interface PackageInfoProps {
  name: string;
}

export function PackageInfo({ name }: PackageInfoProps) {
  const npmUrl = `https://www.npmjs.com/package/${name}`;
  const badgeUrl = `https://img.shields.io/npm/v/${name}?style=flat-square&color=0ea5e9`;

  return (
    <a
      href={npmUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose inline-flex items-center gap-1.5 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badgeUrl} alt={`${name} version`} className="h-5" />
    </a>
  );
}
