import { modulKaydet } from '@core/modulKayit'
import Suruculer from './Suruculer'
import Kutuphane from './Kutuphane'

modulKaydet({ id: 'suruculer', ad: 'Sürücüler', ikon: '💽', sira: 10, grup: 'ana', bilesen: Suruculer })
modulKaydet({ id: 'kutuphane', ad: 'Kütüphane', ikon: '🗂️', sira: 20, grup: 'ana', bilesen: Kutuphane })
