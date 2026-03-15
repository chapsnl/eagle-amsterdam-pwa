import { memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, RotateCcw } from "lucide-react";

interface RewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeem: () => void;
}

const RewardDialog = memo(({ open, onOpenChange, onRedeem }: RewardDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[400px] w-[90%] rounded-none bg-primary border-primary p-6">
      <DialogHeader>
        <DialogTitle className="text-primary-foreground text-2xl flex items-center gap-2 tracking-[-0.05em]">
          <Gift className="w-6 h-6 text-primary-foreground" />
          Free Entry!
        </DialogTitle>
        <DialogDescription className="text-primary-foreground/90 text-sm tracking-[-0.02em]">
          Show this screen to the bartender to claim your reward.
        </DialogDescription>
      </DialogHeader>
      <div className="text-center">
        <Gift className="w-20 h-20 text-primary-foreground mx-auto my-4 animate-pulse-red" />
        <p className="text-primary-foreground text-sm font-bold mb-2 tracking-[-0.02em]">
          Collect 10 stamps to receive one free entry to an Eagle Amsterdam organized event.
        </p>
      </div>
      <Button variant="eagle-outline" size="lg" className="w-full rounded-none border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary tracking-[-0.02em]" onClick={onRedeem}>
        <RotateCcw className="w-5 h-5 mr-2" />
        RESET CARD & REDEEM
      </Button>
      <p className="text-primary-foreground/70 text-xs text-center mt-2 tracking-[-0.02em] italic">
        *Do not click, the bartender will click & redeem for you. Otherwise you will loose your points.
      </p>
    </DialogContent>
  </Dialog>
));

RewardDialog.displayName = "RewardDialog";

export default RewardDialog;
