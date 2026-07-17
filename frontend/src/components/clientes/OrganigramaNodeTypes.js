import {
  RootNode,
  AreaNode,
  ClienteNode,
  EquipoNode,
  EmpleadoNode,
} from './OrganigramaNode';
import { NODE_TYPES } from './useOrganigramaData';

export const nodeTypes = {
  [NODE_TYPES.ROOT]: RootNode,
  [NODE_TYPES.AREA]: AreaNode,
  [NODE_TYPES.CLIENTE]: ClienteNode,
  [NODE_TYPES.EQUIPO]: EquipoNode,
  [NODE_TYPES.EMPLEADO]: EmpleadoNode,
};

export default nodeTypes;
