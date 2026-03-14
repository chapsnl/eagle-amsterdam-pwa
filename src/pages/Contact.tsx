import { useState } from "react";
import { MapPin, ExternalLink, Send, Loader2, Mail, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject is too long"),
  question: z.string().trim().min(1, "Question is required").max(5000, "Message is too long"),
});

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", question: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: result.data,
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to send message");
      }

      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setForm({ name: "", email: "", subject: "", question: "" });
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <MapPin className="w-7 h-7 text-primary" />
        CONTACT
      </h1>

      {/* Opening Hours */}
      <div className="border border-border rounded-lg p-6 bg-card neon-border mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          OPENING HOURS
        </h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Monday</span><span className="text-foreground font-semibold">Closed</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tuesday</span><span className="text-foreground font-semibold">Closed</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Wednesday</span><span className="text-foreground font-semibold">Closed</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Thursday</span><span className="text-foreground font-semibold">22:00 – 04:00</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Friday</span><span className="text-foreground font-semibold">22:00 – 05:00</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Saturday</span><span className="text-foreground font-semibold">22:00 – 05:00</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sunday</span><span className="text-foreground font-semibold">22:00 – 04:00</span></div>
        </div>
        {/* For daytime parties and special events, check the Agenda page */}
        <p className="text-xs text-muted-foreground mt-4 italic">
          For daytime parties & special events, check our Agenda.
        </p>
      </div>

      <Button
        variant="eagle"
        size="lg"
        className="w-full mb-4"
        onClick={() =>
          window.open(
            "https://www.google.com/maps/search/?api=1&query=Eagle+Amsterdam+Warmoesstraat+90",
            "_blank"
          )
        }
      >
        <ExternalLink className="w-5 h-5 mr-2" />
        OPEN IN GOOGLE MAPS
      </Button>

      {/* Newsletter Signup */}
      <div className="border border-border rounded-lg p-6 bg-card neon-border mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          MAILING LIST
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Subscribe to our mailing list to stay updated only 4 times a year.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = z.string().trim().email().safeParse(newsletterEmail);
            if (!parsed.success) {
              toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
              return;
            }
            setIsSubscribing(true);
            try {
              const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
                body: { email: parsed.data },
              });
              if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed to subscribe");
              toast({ title: "Subscribed!", description: "You've been added to our mailing list." });
              setNewsletterEmail("");
            } catch (err) {
              toast({ title: "Error", description: (err as Error).message || "Something went wrong.", variant: "destructive" });
            } finally {
              setIsSubscribing(false);
            }
          }}
          className="flex gap-2"
        >
          <Input
            type="email"
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder="your@email.com"
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground flex-1"
            maxLength={255}
          />
          <Button type="submit" variant="eagle" disabled={isSubscribing} className="shrink-0">
            {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "JOIN"}
          </Button>
        </form>
      </div>

      {/* Group Chats */}
      <div className="border border-border rounded-lg p-6 bg-card neon-border mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          JOIN OUR GROUP CHATS
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Stay connected with the Eagle Amsterdam community.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => window.open("https://t.me/EagleAmsterdam#", "_blank")}
            className="flex flex-col items-center gap-2 rounded-lg p-4 text-white transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: "#0088CC" }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="text-xs font-semibold tracking-wide">Telegram</span>
          </button>
          <button
            onClick={() => window.open("https://chat.whatsapp.com/EuQWEYR7b0rFpvg9hqTS7i", "_blank")}
            className="flex flex-col items-center gap-2 rounded-lg p-4 text-white transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: "#25D366" }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-semibold tracking-wide">WhatsApp</span>
          </button>
          <button
            onClick={() => window.open("https://signal.group/#CjQKIONFQYIMzKdPpit5ANlDJoBKiB017zanM0_uKs_7FirCEhBaQnKL7c2Ma-ADkwM6-6iT", "_blank")}
            className="flex flex-col items-center gap-2 rounded-lg p-4 text-white transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: "#3A76F0" }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.206c5.384 0 9.794 4.41 9.794 9.794 0 5.384-4.41 9.794-9.794 9.794-1.467 0-2.86-.326-4.108-.91l-.252-.126-.27.072-2.876.762.762-2.876.072-.27-.126-.252A9.746 9.746 0 012.206 12c0-5.384 4.41-9.794 9.794-9.794zM8.5 7a.5.5 0 00-.5.5v2a.5.5 0 00.5.5H10v1H8.5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5H10v-1h1.5a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-3zm5 0a.5.5 0 00-.5.5v6a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-6a.5.5 0 00-.5-.5h-3z"/>
            </svg>
            <span className="text-xs font-semibold tracking-wide">Signal</span>
          </button>
        </div>
      </div>

      <div className="mt-2 mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">
          SEND US A MESSAGE
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name" className="text-foreground text-sm font-semibold">
              Name *
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your full name"
              className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={100}
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground text-sm font-semibold">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="your@email.com"
              className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={255}
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="subject" className="text-foreground text-sm font-semibold">
              Subject *
            </Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => handleChange("subject", e.target.value)}
              placeholder="What is this about?"
              className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={200}
            />
            {errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label htmlFor="question" className="text-foreground text-sm font-semibold">
              Question *
            </Label>
            <Textarea
              id="question"
              value={form.question}
              onChange={(e) => handleChange("question", e.target.value)}
              placeholder="Type your question or message here..."
              className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[120px]"
              maxLength={5000}
            />
            {errors.question && <p className="text-destructive text-xs mt-1">{errors.question}</p>}
          </div>

          <Button
            type="submit"
            variant="eagle"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {isSubmitting ? "SENDING..." : "SUBMIT"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
