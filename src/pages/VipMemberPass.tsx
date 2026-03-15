import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2, Minimize2 } from "lucide-react";
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
      const { data, error } = await supabase.functions.invoke("get-profile", {
        body: { userId },
      });

      if (error || !data?.success) {
        console.error("[MemberPass] Failed to load profile:", error || data?.error);
        return;
      }

      const profile = data.profile;
      if (profile.member_number) {
        setMemberNumber(profile.member_number);
        const stored = localStorage.getItem("vip_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!parsed.member_number) {
            parsed.member_number = profile.member_number;
            localStorage.setItem("vip_session", JSON.stringify(parsed));
          }
        }
      }
      if (profile.profile_image_url) {
        setProfileImage(profile.profile_image_url);
      }
      if (profile.created_at) {
        const d = new Date(profile.created_at);
        setMemberSince(
          `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
        );
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", session.userId);

      const { data, error } = await supabase.functions.invoke("upload-profile-image", {
        body: formData,
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Upload failed");
      }

      setProfileImage(data.imageUrl);
      toast.success("Photo updated");
    } catch (err: any) {
      console.error("[MemberPass] Upload error:", err);
      toast.error(err.message || "Failed to upload photo");
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
        <img src={eagleLogo} alt="Eagle Amsterdam" className="h-12 w-auto opacity-90" />
        <span className="text-primary-foreground/80 text-[10px] font-bold tracking-[0.25em] uppercase">
          VIP Member
        </span>
      </div>

      {/* Profile image (display only) */}
      {profileImage && (
        <div className="absolute left-5 top-[4.5rem]">
          <div className="w-16 h-16 bg-primary-foreground/10 border border-primary-foreground/20 overflow-hidden flex items-center justify-center">
            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Name + Email + Member Since - left bottom area */}
      <div className="absolute left-5 bottom-4 space-y-0.5">
        <p className="text-primary-foreground font-bold text-sm tracking-wider truncate uppercase">
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

      {/* Bottom right: Member number + QR Code */}
      <div className="absolute right-5 bottom-4 flex flex-col items-end gap-2">
        <p className="text-primary-foreground font-mono text-lg font-bold tracking-[0.3em]">
          {memberNumber
            ? memberNumber.replace(/(.{4})/g, "$1 ").trim()
            : "---- ----"}
        </p>
        {memberNumber && (
          <div className="bg-white p-1.5">
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
