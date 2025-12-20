export type GameState = 
  | 'intro' 
  | 'gift_wait' 
  | 'tree_revealed' 
  | 'morphing' 
  | 'dissolving' 
  | 'ended';

export interface UIState {
  message: string;
  opacity: number;
}
