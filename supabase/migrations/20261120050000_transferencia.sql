-- Forma de pago "Transferencia" (bancaria), como pide el documento de alcances.
alter type public.metodo_pago add value if not exists 'transferencia' before 'tarjeta';
