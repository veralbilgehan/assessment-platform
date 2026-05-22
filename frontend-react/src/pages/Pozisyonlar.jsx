import { useState } from 'react';
import PozisyonDetay from '../components/PozisyonDetay.jsx';
import DegerlendirmeModal from '../components/DegerlendirmeModal.jsx';

export default function Pozisyonlar({ selectedId, onSelect }) {
  const [modalId, setModalId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState('');

  function handleSelect(id, bc) {
    onSelect(id);
    setBreadcrumb(bc || '');
  }

  return (
    <>
      <PozisyonDetay
        pozisyonId={selectedId}
        breadcrumb={breadcrumb}
        onDegerlendirmeOlustur={(id) => setModalId(id)}
      />
      {modalId && <DegerlendirmeModal id={modalId} onClose={() => setModalId(null)} />}
    </>
  );
}
