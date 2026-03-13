import { MapPin, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const JOTFORM_URL = "https://form.jotform.com/242694291362057";

const Contact = () => (
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
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <a href="mailto:info@eagleamsterdam.com" className="hover:text-foreground transition-colors">
            info@eagleamsterdam.com
          </a>
        </div>
      </div>
    </div>

    <Button
      variant="eagle"
      size="lg"
      className="w-full"
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

    <div className="mt-6 rounded-lg overflow-hidden border border-border">
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

    {/* Jotform Contact Form */}
    <div className="mt-6 mb-4">
      <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">
        SEND US A MESSAGE
      </h2>
      <div className="rounded-lg overflow-hidden border border-border bg-card">
        <iframe
          title="Contact Form"
          src={JOTFORM_URL}
          width="100%"
          height="500"
          style={{ border: 0, background: "transparent" }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  </div>
);

export default Contact;
