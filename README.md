# Visualizador de Esfera de Bloch - Chrome Extension

Una extensión de Google Chrome para visualizar estados cuánticos de 1 a 5 Qubits en Esferas de Bloch interactivas utilizando **Three.js**.

Esta herramienta es ideal para estudiantes y desarrolladores de computación cuántica, permitiendo visualizar la superposición, la fase y el entrelazamiento (estados mixtos) directamente desde el navegador.

## 🚀 Características

* **Visualización 3D:** Esferas de Bloch interactivas (rotar, zoom) renderizadas con Three.js.
* **Soporte Multi-Qubit:** Soporta vectores de estado de hasta 5 Qubits (vectores de longitud 32).
* **Estados Mixtos y Entrelazamiento:** Calcula automáticamente la Matriz de Densidad Reducida. Si un qubit está entrelazado, el vector de Bloch se acorta para representar la incertidumbre (estado mixto).
* **Detección Automática:** Monitoriza la página web activa en busca de vectores de estado con formato Python/Numpy (ej: `[0.707+0j, 0.707+0j]`) y los visualiza automáticamente.
* **Panel Lateral:** Funciona en el Panel Lateral (Side Panel) de Chrome para permitir la navegación simultánea sin cerrarse.
* **Convención Little Endian:** Utiliza la convención estándar de Qiskit donde el Qubit 0 es el bit menos significativo (derecha).

## 📂 Estructura del Proyecto

El proyecto está construido con Javascript vainilla (sin frameworks de compilación) para facilitar el aprendizaje y la modificación.

* **`manifest.json`**: Configuración de la extensión (Manifest V3). Define los permisos (`sidePanel`, `scripting`, `activeTab`), los scripts de fondo y la política de seguridad.
* **`popup.html`**: La interfaz de usuario. Contiene el input de texto, los botones de ejemplos y los contenedores para los canvas 3D.
* **`popup.js`**: El núcleo lógico de la aplicación.
    * **Parseo:** Convierte strings de texto en arrays de objetos `Complex`.
    * **Física Cuántica:** Implementa la lógica de la **Traza Parcial** para extraer el estado de un qubit individual a partir de un sistema multi-qubit.
    * **Renderizado:** Utiliza Three.js para dibujar las esferas, vectores, ejes y etiquetas (`|0>`, `|1>`, `|+>`, etc.).
    * **Inyección:** Contiene la lógica para leer el DOM de la página activa y buscar vectores.
* **`background.js`**: Service Worker ligero que maneja la apertura de la extensión como un Panel Lateral al hacer clic en el icono.
* **Dependencias:**
    * `three.module.js`: Motor 3D.
    * `OrbitControls.js`: Controlador para rotar la cámara con el ratón.

## 🧮 Base Matemática

La extensión toma un vector de estado puro $|\psi\rangle$ de $N$ qubits. Para visualizar el qubit $k$, calculamos su **Matriz de Densidad Reducida** ($\rho_k$) realizando la traza parcial sobre el resto del sistema:

$$
\rho_k = \text{Tr}_{\text{resto}}(|\psi\rangle\langle\psi|)
$$

El vector de Bloch $\vec{r} = (r_x, r_y, r_z)$ se extrae de $\rho_k$ tal que:

$$
\rho_k = \frac{I + \vec{r} \cdot \vec{\sigma}}{2}
$$

Si $|\vec{r}| < 1$, el estado es mixto, lo que indica que el qubit está entrelazado con otros qubits del sistema.

## 🛠️ Instalación y Uso

Como esta extensión no está en la Chrome Web Store (aún), debes instalarla en "Modo Desarrollador":

1. **Clona o descarga** este repositorio en tu ordenador.
2. Abre Google Chrome y ve a `chrome://extensions/`.
3. Activa el interruptor **"Modo de desarrollador"** en la esquina superior derecha.
4. Haz clic en el botón **"Cargar descomprimida"** (Load Unpacked).
5. Selecciona la carpeta donde descargaste los archivos.
6. ¡Listo! Verás el icono de la bombilla en tu barra de extensiones.

### Cómo usarla

1. Haz clic en el icono de la extensión para abrir el **Panel Lateral**.
2. **Opción A (Manual):** Escribe un vector de estado en el cuadro de texto. Ejemplo: `[0.707, 0.707]` y pulsa "Visualizar".
3. **Opción B (Automática):** Navega por una web que contenga vectores cuánticos (ej: tutoriales de Qiskit o documentación). La extensión detectará el vector y mostrará un icono de "Ojo" verde 👁️. El estado se visualizará automáticamente. En concreto, en la IBM Quantum Platform, debes activar el panel de "Vector de Estado" (en lugar del panel de amplitudes de probabilidad). 

## 📝 Créditos

Desarrollado como proyecto educativo para visualización de computación cuántica, por Antonio Morales García
Utiliza la librería [Three.js](https://threejs.org/).
