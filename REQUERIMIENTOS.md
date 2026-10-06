# Requerimientos del sistema de cine

Este documento reúne los requerimientos comunicados para el sistema y contrasta su cobertura con el código del proyecto.

- `✓` indica que se encontró una implementación de la función o regla en el código. No implica que esté lista para producción.
- Los requisitos sin `✓` están incompletos, no se encontraron implementados o solo se cubren parcialmente; se indica el motivo cuando corresponde.

La revisión fue estática, sobre el código fuente. No se hizo una prueba integral de cada flujo en un entorno desplegado.

## 1. Catálogo y funciones

- ✓ Mostrar en la página principal las películas disponibles y permitir al administrador elegir qué películas se publican.
- ✓ Gestionar los datos principales de cada película: nombre, duración, póster, sinopsis, clasificación por edad, fecha de estreno y precio.
- ✓ Asociar varios géneros a una película y permitir filtrar el catálogo por género.
- ✓ Mostrar primero las tres películas más vendidas en la página principal.
- ✓ Buscar películas por texto.
- ✓ Configurar funciones con película, días de la semana, horario, modalidad 2D/3D/4D/5D, idioma castellano/subtitulado y precio.
- ✓ Rechazar conflictos de horario en una sala y exigir 30 minutos entre funciones, teniendo en cuenta la duración de la película.
- La asignación automática de una sala libre no está completa: el formulario exige que administración elija la sala; el sistema valida esa sala, pero no busca otra sala automáticamente.
- ✓ Admitir restricciones ATP, +13 y +18; impedir compras por debajo de la edad mínima y mostrar aviso de acompañamiento adulto en las entradas con restricción.

Código relacionado: [catálogo](src/app/compartido/servicios/pelicula.servicio.ts), [programación](src/app/compartido/servicios/programacion.servicio.ts), [reglas de salas](src/app/nucleo/dominio/programacion-salas.ts), [restricción de edad](src/app/nucleo/dominio/restriccion-edad.ts).

## 2. Salas, butacas y compra

- ✓ Crear salas y generar automáticamente sus butacas.
- ✓ Aplicar la distribución solicitada: filas A–T, sectores 4/20/4; filas J y K adaptadas con sectores 2/10/2; filas R, S y T VIP.
- ✓ Resaltar visualmente las butacas accesibles y VIP, y aplicar un precio superior a las VIP.
- La disponibilidad de butacas no está sincronizada en tiempo real entre distintos usuarios o dispositivos: actualmente se simula en memoria dentro de la aplicación.
- ✓ Permitir el flujo de compra a usuarios registrados y visitantes anónimos.
- ✓ Generar y descargar un PDF de entrada con datos de la función, sala, butaca, precio, comprador, clasificación y código QR.
- ✓ Incluir en el QR permisos para entrada y retiro de Candy Bar cuando la compra contiene esos conceptos.
- El QR no se invalida por completo al validar uno de sus conceptos: entrada y retiro de Candy Bar se consumen de forma independiente, por lo que el otro permiso puede seguir utilizándose.
- ✓ Permitir que el personal escanee un QR o introduzca el código manualmente, y rechazar un permiso que ya fue utilizado.

Código relacionado: [generador de butacas](src/app/nucleo/dominio/generador-butacas.ts), [PDF](src/app/cliente/compra/servicios/pdf.servicio.ts), [QR](src/app/compartido/servicios/qr.servicio.ts), [panel de empleado](src/app/empleado/componentes/panel-empleado/panel-empleado.componente.ts).

## 3. Cuentas, descuentos y fidelización

- ✓ Registrar e iniciar sesión con email y contraseña.
- El alta no recopila todos los datos solicitados. Actualmente solicita nombre, apellido, email, contraseña y fecha de nacimiento; no solicita tipo de sangre, color de ojos ni días de vacaciones.
- ✓ Conservar en el modelo de usuario los campos tipo de sangre, color de ojos y días de vacaciones, aunque no se recopilan en el formulario de alta.
- ✓ Aplicar descuento configurable a la primera compra registrada y ofrecer descuento para mayores de 50 años.
- ✓ Administrar cupones y elegir el mayor descuento aplicable, sin acumular descuentos.
- ✓ Acumular puntos en compras de usuarios registrados, mostrar saldo e historial, permitir canjes por recompensas configurables y no ofrecer transferencia de puntos entre usuarios.
- ✓ Permitir aplicar crédito de la cuenta junto con otros descuentos y medios de pago.
- ✓ Permitir cancelar una compra hasta dos horas antes de la función, liberar butacas y acreditar crédito en lugar de devolver dinero.

Código relacionado: [registro](src/app/cliente/cuenta/componentes/registro/registro.componente.ts), [cálculo de descuentos y puntos](src/app/nucleo/dominio/calculo-precio.ts), [fidelización](src/app/compartido/servicios/fidelizacion.servicio.ts), [cancelaciones y compras](src/app/compartido/servicios/compra.servicio.ts).

## 4. Reseñas, Candy Bar y combos

- ✓ Permitir calificar películas con estrellas y publicar comentarios; la reseña requiere una compra de una función ya pasada.
- ✓ Mostrar reseñas y puntuación promedio en el detalle de la película antes de iniciar la compra.
- ✓ Administrar productos y categorías de Candy Bar, y agregarlos al carrito junto con entradas.
- ✓ Crear combos con precio fijo configurable y destacarlos durante la compra.
- El reporte de Candy Bar no identifica el producto más vendido: actualmente agrega las compras que incluyeron Candy Bar, sin contar unidades por producto.

Código relacionado: [reseñas](src/app/compartido/servicios/resena.servicio.ts), [configuración de Candy y combos](src/app/compartido/servicios/candy.servicio.ts), [combos](src/app/compartido/servicios/combo.servicio.ts).

## 5. Preventa y actividad del cliente

- ✓ Mostrar una sección de películas próximas a estrenarse y permitir que un usuario registrado active o quite una alerta.
- La alerta se guarda en memoria, pero no hay una notificación efectiva cuando comienza la venta; falta persistencia y un proceso que envíe o muestre el aviso aunque el usuario no tenga la página abierta.
- La preventa puede activarse por película y ajusta el precio según los días restantes, pero el número de días es global y su valor inicial es 3; no está configurado individualmente por película ni inicia por defecto 7 días antes.
- ✓ Mostrar en “Mis películas” el historial visual de películas vistas, con póster, fecha y calificación propia.

Código relacionado: [preventa](src/app/nucleo/dominio/preventa.ts), [alertas](src/app/cliente/cuenta/servicios/alerta.servicio.ts), [perfil e historial](src/app/cliente/cuenta/servicios/perfil.servicio.ts).

## 6. Administración, empleados y reportes

- ✓ Disponer de áreas separadas para administración y empleados, con rutas protegidas por rol.
- ✓ Administrar películas, funciones, salas, butacas, géneros, productos, categorías, combos, cupones, descuentos, puntos y preventas.
- ✓ Registrar en un log acciones como programación y validación de QR, con usuario y fecha/hora.
- El log de actividad se conserva en memoria; no es un registro persistente ni una auditoría protegida contra modificaciones.
- El reporte diario está disponible, pero el conteo de entradas suma una venta con entradas como una unidad, no la cantidad real de entradas de esa compra.
- ✓ Exportar reportes a PDF y a un archivo `.xls` compatible con Excel/LibreOffice. La exportación Excel utiliza SpreadsheetML 2003, no el formato `.xlsx`.
- ✓ Mostrar gráficas de películas más vistas por semana y por mes.
- El gráfico de Candy Bar no cumple todavía el desglose pedido por producto, como se indica en la sección anterior.

Código relacionado: [rutas de administración](src/app/administrador/administrador.rutas.ts), [reportes](src/app/administrador/servicios/reporte.servicio.ts), [log](src/app/nucleo/servicios/registro-actividad.servicio.ts).

## 7. Experiencia de uso y elementos pendientes

- ✓ Usar controles de fecha y hora del navegador para seleccionar fechas y horarios, y selección por días de la semana al programar funciones.
- La reducción de scroll y la facilidad general de navegación requieren validación de uso con clientes y empleados; no se pueden confirmar solo por la existencia de controles.
- El mapa general del edificio quedó como propuesta sin aprobación y no forma parte de la implementación revisada.

## 8. Estado para producción

Las marcas anteriores describen funciones presentes en el código, incluidas las demostraciones locales. El proyecto todavía no debe considerarse un sistema de venta listo para producción:

- El núcleo de datos se declara como una implementación simulada. Varias operaciones mutan estado en memoria y se pierden al recargar; algunas lecturas o escrituras puntuales sí consultan Supabase, pero el flujo completo no es persistente ni transaccional.
- La autenticación no está integrada con Supabase Auth y el servicio de pago está simulado.
- La disponibilidad en tiempo real, los QR, las alertas, los puntos, el crédito y el log necesitan validación y persistencia del lado del servidor para ser fiables ante varios dispositivos o procesos concurrentes.
- Faltan políticas de seguridad y validaciones de servidor para operaciones sensibles, como compras, descuentos, reservas y validación de QR.

Código relacionado: [capa de datos](src/app/nucleo/servicios/supabase.servicio.ts), [autenticación](src/app/nucleo/servicios/autenticacion.servicio.ts), [pago simulado](src/app/cliente/compra/servicios/pago.servicio.ts), [sincronización de butacas](src/app/compartido/servicios/tiempo-real.servicio.ts).