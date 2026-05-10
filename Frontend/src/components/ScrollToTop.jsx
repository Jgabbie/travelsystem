import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useEffect(() => {
        if (hash) {
            const id = hash.replace('#', '')
            const el = document.getElementById(id)
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'start' })
                return
            }
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [pathname, hash])

    return null
}
