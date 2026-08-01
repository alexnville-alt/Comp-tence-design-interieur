"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "./actions";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pending) return;
    setPending(true);
    try {
      const { id } = await createProjectAction(name);
      router.push(`/atelier/${id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="project-name">Nouveau projet</Label>
        <Input
          id="project-name"
          placeholder="Mon appartement"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !name.trim()}>
        Créer
      </Button>
    </form>
  );
}
