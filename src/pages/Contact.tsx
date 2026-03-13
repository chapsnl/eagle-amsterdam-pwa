import { useState } from "react";
import { MapPin, ExternalLink, Send, Loader2, Mail } from "lucide-react";
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

      <div className="border border-border rounded-lg p-6 bg-card neon-border mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">
          EAGLE AMSTERDAM
        </h2>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p>Warmoesstraat 90</p>
              <p>1012 JH Amsterdam</p>
              <p>The Netherlands</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
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

      {/* Google Maps */}
      <div className="mt-6 rounded-lg overflow-hidden border border-primary">
        <iframe
          title="Eagle Amsterdam location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2436.0!2d4.8966!3d52.3758!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c609b93deae857%3A0xa3c1b0cd1e87b3e3!2sEagle%20Amsterdam!5e0!3m2!1sen!2snl!4v1!5m2!1sen!2snl"
          width="100%"
          height="250"
          style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <Button
        variant="eagle"
        size="lg"
        className="w-full mt-4 mb-4"
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
    </div>
  );
};

export default Contact;
