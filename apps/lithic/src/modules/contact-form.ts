import { sound } from '../ui/sound'

/** Demo form: validates the two required fields, then confirms without sending anything. */
export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]')
  const status = form?.querySelector<HTMLElement>('[data-contact-status]')
  const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!form || !status || !submit) return

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = field('name')
    const email = field('email')
    const invalid = [name, email].filter((input) => !input.value.trim() || !input.checkValidity())
    ;[name, email].forEach((input) => input.setAttribute('aria-invalid', String(invalid.includes(input))))

    if (invalid.length) {
      status.textContent = 'Please add your name and a valid email.'
      invalid[0].focus()
      return
    }

    submit.disabled = true
    status.textContent = 'Sending…'
    window.setTimeout(() => {
      sound.tick(1.2)
      submit.disabled = false
      status.textContent = `Thank you, ${name.value.trim()}. We’ll reply within 48 hours. (This is a demo site: nothing was sent.)`
      form.reset()
    }, 900)
  })
}
