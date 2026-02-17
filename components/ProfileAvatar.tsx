"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { auth, db } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Camera } from "lucide-react";

export default function ProfileAvatar({
  uid,
  onUploaded,
}: {
  uid: string;
  onUploaded?: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    if (!auth.currentUser) return;

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${uid}/avatar.${fileExt}`;

      // upload
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // public url
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const url = data.publicUrl + `?t=${Date.now()}`; // bust cache

      // update firebase auth
      await updateProfile(auth.currentUser, { photoURL: url });
      await auth.currentUser.reload();

      // firestore
      await setDoc(
        doc(db, "users", uid),
        { avatar: url },
        { merge: true }
      );

      // notify parent instantly
      onUploaded?.(url);

    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <label className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer border hover:opacity-80 transition overflow-hidden">
        {auth.currentUser?.photoURL ? (
          <img
            src={auth.currentUser.photoURL}
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="text-muted-foreground" />
        )}

        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) =>
            e.target.files && handleUpload(e.target.files[0])
          }
        />
      </label>

      <div className="text-sm text-muted-foreground">
        {uploading ? "Uploading..." : "Change profile picture"}
      </div>
    </div>
  );
}
