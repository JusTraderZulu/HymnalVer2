"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

let deferredPrompt: any = null;

export default function PWAInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if the install prompt has already been dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent the default prompt
      e.preventDefault();
      // Store the event for later use
      deferredPrompt = e;
      // Show our custom install button
      setIsInstallable(true);
    });

    // Listen for the app installed event to hide the button
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
      });
      window.removeEventListener("appinstalled", () => {});
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, so it's no longer needed
    deferredPrompt = null;
    
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Remember that the user dismissed the prompt
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 relative">
      <div className="flex justify-between items-start">
        <div>
          <AlertTitle>Install App</AlertTitle>
          <AlertDescription>
            Install the Spiritual Baptist Hymnal on your device for offline access.
          </AlertDescription>
        </div>
        <div className="flex gap-2 mt-1">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
} 