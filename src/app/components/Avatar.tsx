"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { createHash } from "crypto";
import Link from "next/link";
import Image from "next/image";

interface AvatarProps {
  email: string;
  isAdmin?: boolean;
  size?: number;
  className?: string;
  showAdminBadge?: boolean;
  linkToProfile?: boolean;
}

function getGravatarUrl(email: string, size: number = 40): string {
  const hash = createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export function Avatar({
  email,
  isAdmin = false,
  size = 32,
  className = "",
  showAdminBadge = true,
  linkToProfile = false,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const gravatarUrl = getGravatarUrl(email, size);

  const avatarContent = (
    <div className={`relative ${className}`}>
      <div
        className="rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300 cursor-pointer"
        style={{ width: size, height: size }}
      >
        {!imageError ? (
          <Image
            src={gravatarUrl}
            width={size}
            height={size}
            alt={`${email} avatar`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <User size={size * 0.6} className="text-gray-400" />
        )}
      </div>

      {isAdmin && showAdminBadge && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
      )}
    </div>
  );

  if (linkToProfile) {
    return (
      <Link href="/profile" className="hover:opacity-80 transition-opacity">
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
}
