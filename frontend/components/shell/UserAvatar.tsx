"use client";

import Image from "next/image";
import { usePersonalization } from "@/lib/usePersonalization";

interface UserAvatarProps {
  size?: number;
}

/** Circular avatar from localStorage photo or initials fallback. */
export function UserAvatar({ size = 36 }: UserAvatarProps) {
  const { photo, name } = usePersonalization();

  const initials = (name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className="avatar-ring inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-accent)_20%,transparent)] text-accent"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {photo ? (
        <Image
          src={photo}
          alt="Avatar"
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-semibold leading-none">{initials}</span>
      )}
    </span>
  );
}
