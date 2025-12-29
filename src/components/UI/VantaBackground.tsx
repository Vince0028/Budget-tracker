import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore
import FOG from 'vanta/dist/vanta.fog.min';

const VantaBackground: React.FC = () => {
    const [vantaEffect, setVantaEffect] = useState<any>(null);
    const myRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!vantaEffect && myRef.current) {
            setVantaEffect(FOG({
                el: myRef.current,
                THREE: THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                highlightColor: 0xffffff,
                midtoneColor: 0xffffff,
                lowlightColor: 0xffffff,
                baseColor: 0x434343,
                blurFactor: 0.6,
                speed: 1.0,
                zoom: 1.0
            }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <div ref={myRef} className="absolute inset-0 -z-10 w-full h-full" />
    );
};

export default VantaBackground;
