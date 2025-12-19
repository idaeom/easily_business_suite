"use client"

// Simplified version of use-toast for now
import { useState, useEffect } from "react"

type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>([])

    function toast(props: ToastProps) {
        setToasts((prev) => [...prev, props])
        // In a real app, this would trigger a global toaster component
        console.log("Toast:", props)
        alert(`${props.title}\n${props.description || ""}`) // Fallback for now
    }

    return {
        toast,
        toasts,
        dismiss: (id: string) => { },
    }
}
