import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  error?: string | null;
};

export default function LoginDialog({
  open,
  onOpenChange,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
}: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 max-w-sm">
        <DialogHeader>
          <DialogTitle>Log in</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Email"
            type="email"
            autoFocus
          />
          <Input
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Password"
            type="password"
          />
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
        </div>
        <DialogFooter className="flex gap-2">
          <Button onClick={onSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
