import { type SetStateAction, type Dispatch } from 'react';
import Actions from './Actions';

export type StateAction<T = any> = Dispatch<SetStateAction<T>>;

// Actions for updating state and triggering refresh in Editor Component via StateAction
export default class StateActions extends Actions {
  protected readonly stateAction: StateAction;

  constructor(stateAction: StateAction) {
    super();
    this.stateAction = stateAction;
  }
}
