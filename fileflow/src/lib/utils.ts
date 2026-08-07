import { cn as primeuix_cn } from '@primeuix/utils';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: Parameters<typeof primeuix_cn>) {
    return twMerge(primeuix_cn(...inputs));
}
