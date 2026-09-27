"use client";

import { use } from "react";

import { FamilyTown } from "@/components/family/family-town";

export default function Page({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params);
  return <FamilyTown profileId={profileId} />;
}
