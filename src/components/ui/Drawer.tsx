import type { ComponentProps } from 'react';
import { Modal } from './Modal';

type DrawerProps = Omit<ComponentProps<typeof Modal>, 'placement' | 'size'>;

/** Right-hand side sheet (detail views, stop lists, filters). Same focus trap / Escape / scroll-lock behaviour as Modal. */
export function Drawer(props: DrawerProps) {
  return <Modal {...props} placement="right" />;
}
