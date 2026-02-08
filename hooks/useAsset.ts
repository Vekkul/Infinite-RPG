
import { useState, useEffect } from 'react';
import { assetService } from '../services/assetService';

export const useAsset = (assetId: string | null | undefined) => {
    const [assetUrl, setAssetUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!assetId) {
            setAssetUrl('');
            return;
        }

        // Handle legacy/fallback raw base64 or SVG strings directly
        if (assetId.startsWith('data:') || assetId.startsWith('PHN2Zy') || assetId.length > 500) {
             if (assetId.startsWith('PHN2Zy')) {
                 setAssetUrl(`data:image/svg+xml;base64,${assetId}`);
             } else if (!assetId.startsWith('data:')) {
                 setAssetUrl(`data:image/png;base64,${assetId}`);
             } else {
                 setAssetUrl(assetId);
             }
             return;
        }

        let active = true;
        let objectUrl: string | null = null;

        const load = async () => {
            setIsLoading(true);
            try {
                const blob = await assetService.loadAsset(assetId);
                if (active && blob) {
                    objectUrl = URL.createObjectURL(blob);
                    setAssetUrl(objectUrl);
                }
            } catch (e) {
                console.warn("Failed to load asset URL", e);
            } finally {
                if (active) setIsLoading(false);
            }
        };

        load();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [assetId]);

    return { assetUrl, isLoading };
};
