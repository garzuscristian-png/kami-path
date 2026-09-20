import { createContext, useContext } from "react";
import { createLandscape } from "@/lib/game/landscape";
export const WorldContext = createContext(createLandscape("coast", 1001));
export const useWorld = () => useContext(WorldContext);
