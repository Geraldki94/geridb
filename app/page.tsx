import { GeriDbAuthGate } from '@/components/geridb-auth-gate';
import { KernTableWorkspace } from '@/components/kerntable-workspace';

export default function Home() {
  return (
    <GeriDbAuthGate>
      <KernTableWorkspace />
    </GeriDbAuthGate>
  );
}
