import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Maximize2, Minimize2, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import eagleLogo from "@/assets/eagle-logo-white.webp";

interface VipSession {
  userId: string;
  email: string;
  name: string;
  member_number?: string;
  verified: boolean;
}

const VipMemberPass = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<VipSession | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [memberNumber, setMemberNumber] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        if (parsed.member_number) setMemberNumber(parsed.member_number);
        loadProfile(parsed.userId);
      } catch {
        navigate("/vip/login");
      }
    } else {
      navigate("/vip/login");
    }
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("member_number, profile_image_url")
        .eq("id", userId)
        .single();

      if (data) {
        if (data.member_number) {
          setMemberNumber(data.member_number);
          // Update session with member_number if missing
          const stored = localStorage.getItem("vip_session");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!parsed.member_number) {
              parsed.member_number = data.member_number;
              localStorage.setItem("vip_session", JSON.stringify(parsed));
            }
          }
        }
        if (data.profile_image_url) {
          setProfileImage(data.profile_image_url);
        }
      }
    } catch (err) {
      console.error("[MemberPass] Failed to load profile:", err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${session.userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ profile_image_url: imageUrl })
        .eq("id", session.userId);

      setProfileImage(imageUrl);
      toast.success("Photo updated");
    } catch (err: any) {
      console.error("[MemberPass] Upload error:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!session) return null;

  const cardContent = (
    <div
      ref={cardRef}
      className={`relative overflow-hidden border border-border bg-gradient-to-br from-secondary via-background to-secondary ${
        isFullscreen
          ? "w-full max-w-lg mx-auto"
          : "w-full"
      }`}
      style={{ aspectRatio: isFullscreen ? "auto" : undefined }}
    >
      {/* Top red accent stripe */}
      <div className="h-1.5 bg-primary w-full" />

      {/* Card body */}
      <div className="p-5 space-y-5">
        {/* Header row: Logo + Title */}
        <div className="flex items-center justify-between">
          <img src={eagleLogo} alt="Eagle Amsterdam" className="h-8 w-auto" />
          <span className="text-xs font-bold tracking-[0.3em] text-primary uppercase">
            VIP Member
          </span>
        </div>

        {/* Main content: Photo + Info */}
        <div className="flex gap-4 items-start">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 bg-secondary border border-border overflow-hidden flex items-center justify-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center border border-border hover:opacity-90 transition-opacity"
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-foreground font-bold text-lg leading-tight truncate">
              {session.name}
            </p>
            <p className="text-muted-foreground text-xs truncate">
              {session.email}
            </p>
            <div className="pt-1">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Member ID
              </p>
              <p className="text-foreground font-mono text-base font-bold tracking-[0.2em]">
                {memberNumber || "--------"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom row: QR Code + Status */}
        <div className="flex items-end justify-between border-t border-border pt-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Status
            </p>
            <p className="text-primary text-sm font-bold tracking-wider">
              ACTIVE
            </p>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest pt-1">
              Member Since
            </p>
            <p className="text-foreground text-xs">
              {new Date().getFullYear()}
            </p>
          </div>

          {/* QR Code */}
          {memberNumber && (
            <div className="bg-white p-2">
              <QRCodeSVG
                value={memberNumber}
                size={isFullscreen ? 100 : 80}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom red accent stripe */}
      <div className="h-1.5 bg-primary w-full" />
    </div>
  );

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {isFullscreen ? (
        /* Fullscreen overlay */
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 w-10 h-10 bg-secondary text-foreground flex items-center justify-center border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          {cardContent}
        </div>
      ) : (
        /* Normal page view */
        <div className="flex flex-col min-h-screen pb-24">
          <div className="pt-8 px-4 max-w-[90%] mx-auto w-full space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl text-foreground tracking-wider">
                MEMBER PASS
              </h1>
              <p className="text-muted-foreground text-xs">
                Your digital VIP membership card
              </p>
            </div>

            {cardContent}

            <button
              onClick={toggleFullscreen}
              className="w-full h-12 bg-secondary text-foreground flex items-center justify-center gap-2 border border-border hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-bold tracking-wider"
            >
              <Maximize2 className="w-4 h-4" />
              FULLSCREEN VIEW
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VipMemberPass;
