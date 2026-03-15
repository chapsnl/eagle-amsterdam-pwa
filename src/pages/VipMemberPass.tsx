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
  const [memberSince, setMemberSince] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select("member_number, profile_image_url, created_at")
        .eq("id", userId)
        .single();

      if (data) {
        if (data.member_number) {
          setMemberNumber(data.member_number);
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
        if (data.created_at) {
          const d = new Date(data.created_at);
          setMemberSince(
            `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
          );
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
      // Check if we have an active Supabase session
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        console.warn("[MemberPass] No Supabase auth session, attempting re-auth...");
        toast.error("Please log in again to upload a photo");
        setUploading(false);
        return;
      }

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
      className={`relative overflow-hidden bg-primary rounded-[2rem] ${
        isFullscreen ? "w-full max-w-lg mx-auto" : "w-full"
      }`}
      style={{ aspectRatio: "1.586/1" }}
    >
      {/* Top bar: Logo + VIP label */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
        <img src={eagleLogo} alt="Eagle Amsterdam" className="h-6 w-auto opacity-90" />
        <span className="text-primary-foreground/80 text-[10px] font-bold tracking-[0.25em] uppercase">
          VIP Member
        </span>
      </div>

      {/* Photo area - left side */}
      <div className="absolute left-5 top-14">
        <div className="relative">
          <div className="w-16 h-16 bg-primary-foreground/10 border border-primary-foreground/20 overflow-hidden flex items-center justify-center">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-primary-foreground/40" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-foreground text-primary flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            {uploading ? (
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Member ID - center, large */}
      <div className="absolute left-5 right-5 bottom-[5.5rem]">
        <p className="text-primary-foreground font-mono text-2xl font-bold tracking-[0.35em]">
          {memberNumber
            ? memberNumber.replace(/(.{4})/g, "$1 ").trim()
            : "---- ----"}
        </p>
      </div>

      {/* Bottom row: Name, Since, QR */}
      <div className="absolute left-5 right-5 bottom-3 flex items-end justify-between">
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-primary-foreground font-bold text-2xl tracking-wider truncate uppercase">
            {session.name}
          </p>
          <p className="text-black text-sm truncate">
            {session.email}
          </p>
          <div className="flex gap-6 pt-1">
            <div>
              <p className="text-primary-foreground/40 text-[8px] uppercase tracking-widest">
                Member Since
              </p>
              <p className="text-primary-foreground/80 text-[11px] font-mono">
                {memberSince || "--/--/----"}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/40 text-[8px] uppercase tracking-widest">
                Status
              </p>
              <p className="text-primary-foreground/80 text-[11px] font-bold tracking-wider">
                ACTIVE
              </p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        {memberNumber && (
          <div className="bg-white p-1.5 flex-shrink-0">
            <QRCodeSVG
              value={memberNumber}
              size={isFullscreen ? 64 : 52}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {isFullscreen ? (
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
