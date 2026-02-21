'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function Logo() {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="group inline-flex items-center gap-2">
      <span className="inline-flex items-center transition group-hover:opacity-90">
        <Image
          src="/brand/logo.png"
          alt="ExportFlow"
          width={390}
          height={93}
          priority
          className="h-[66px] w-auto sm:h-[72px]"
        />
      </span>
    </Link>
  );
}

