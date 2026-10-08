import { mountCacheLab } from './cache-replacement-ui.mjs';

try {
  const response = await fetch(new URL('./cache-replacement.json', import.meta.url));
  if (!response.ok) throw new Error('The lesson file could not be loaded.');
  mountCacheLab(document, { courseText: await response.text() });
} catch (error) {
  document.querySelector('#input-error').textContent = 'This lab could not load its checked lesson. Reload the page or use the self-contained cache-replacement.html file.';
}
