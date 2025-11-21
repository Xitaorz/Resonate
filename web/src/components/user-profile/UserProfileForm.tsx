import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserProfile = {
  uid: number
  username: string
  email: string
  gender: string | null
  age: number | null
  street: string | null
  city: string | null
  province: string | null
  mbti: string | null
  hobbies: string[]
}

export type UpdateUserInput = {
  username: string
  email: string
  gender: string | null
  age: number | null
  street: string | null
  city: string | null
  province: string | null
  mbti: string | null
  hobbies: string[]
}

type Props = {
  profile: UserProfile
  onSubmit: (payload: UpdateUserInput) => void
  isSubmitting: boolean
  errorMessage?: string | null
  lastSaved?: Date | null
}

export function UserProfileForm({
  profile,
  onSubmit,
  isSubmitting,
  errorMessage,
  lastSaved,
}: Props) {
  const [username, setUsername] = useState(profile.username)
  const [email, setEmail] = useState(profile.email)
  const [gender, setGender] = useState(profile.gender ?? '')
  const [age, setAge] = useState(profile.age?.toString() ?? '')
  const [street, setStreet] = useState(profile.street ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [province, setProvince] = useState(profile.province ?? '')
  const [mbti, setMbti] = useState(profile.mbti ?? '')
  const [hobbiesText, setHobbiesText] = useState(profile.hobbies.join(', '))

  useEffect(() => {
    setUsername(profile.username)
    setEmail(profile.email)
    setGender(profile.gender ?? '')
    setAge(profile.age?.toString() ?? '')
    setStreet(profile.street ?? '')
    setCity(profile.city ?? '')
    setProvince(profile.province ?? '')
    setMbti(profile.mbti ?? '')
    setHobbiesText(profile.hobbies.join(', '))
  }, [profile])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const hobbies = hobbiesText
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    const dedupedHobbies = Array.from(new Set(hobbies))

    const parsedAge =
      age.trim() === '' ? null : Number.isNaN(Number(age)) ? null : Number(age)

    const normalizedUsername = username.trim()
    const normalizedEmail = email.trim()

    onSubmit({
      username: normalizedUsername,
      email: normalizedEmail,
      gender: gender.trim() === '' ? null : gender.trim(),
      age: parsedAge,
      street: street.trim() === '' ? null : street.trim(),
      city: city.trim() === '' ? null : city.trim(),
      province: province.trim() === '' ? null : province.trim(),
      mbti: mbti.trim() === '' ? null : mbti.trim(),
      hobbies: dedupedHobbies,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          aria-label="Username"
          required
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          type="email"
          required
        />
        <Input
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          placeholder="Gender"
          aria-label="Gender"
        />
        <Input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age"
          aria-label="Age"
          inputMode="numeric"
        />
        <Input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Street"
          aria-label="Street"
        />
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          aria-label="City"
        />
        <Input
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          placeholder="Province"
          aria-label="Province"
        />
        <Input
          value={mbti}
          onChange={(e) => setMbti(e.target.value)}
          placeholder="MBTI"
          aria-label="MBTI"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Hobbies (comma separated)
        </label>
        <Input
          value={hobbiesText}
          onChange={(e) => setHobbiesText(e.target.value)}
          placeholder="guitar, hiking, photography"
          aria-label="Hobbies"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        {lastSaved ? (
          <span className="text-sm text-muted-foreground">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        ) : null}
        {errorMessage ? (
          <span className="text-sm text-destructive">{errorMessage}</span>
        ) : null}
      </div>
    </form>
  )
}
