import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { APP_CONFIG } from '@/config/app.config'

export default function StyleGuidePage() {
  return (
    <Layout>
      <Header ctaHref="https://github.com/new?template_name=firecrawl-style-guide&template_owner=your-org" />
      
      <Hero 
        title="Firecrawl Style Guide"
        subtitle="UI components and design patterns"
      />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div className="space-y-16">
          {/* Buttons Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-4">All Buttons with Box Shadow Effects</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="code">Code</Button>
                  <Button variant="orange">Orange</Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-4">Disabled States</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="default" disabled>Default</Button>
                  <Button variant="secondary" disabled>Secondary</Button>
                  <Button variant="outline" disabled>Outline</Button>
                  <Button variant="destructive" disabled>Destructive</Button>
                  <Button variant="code" disabled>Code</Button>
                  <Button variant="orange" disabled>Orange</Button>
                </div>
              </div>
            </div>
          </section>

          {/* Universal Input Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Universal Input with Box Shadow</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-4">Input States</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="input-default">Default Input</Label>
                    <Input id="input-default" type="text" placeholder="Enter text..." />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-focused">Focused Input (click to see)</Label>
                    <Input id="input-focused" type="text" placeholder="Click me to see focus state" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-filled">Filled Input</Label>
                    <Input id="input-filled" type="text" defaultValue="Example content" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-disabled">Disabled Input</Label>
                    <Input id="input-disabled" type="text" placeholder="Disabled" disabled />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-4">Input Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="input-email">Email</Label>
                    <Input id="input-email" type="email" placeholder={`email@${APP_CONFIG.domain}`} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-password">Password</Label>
                    <Input id="input-password" type="password" placeholder="Enter password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-number">Number</Label>
                    <Input id="input-number" type="number" placeholder="123" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="input-search">Search</Label>
                    <Input id="input-search" type="search" placeholder="Search..." />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Other Form Components Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Other Form Components</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="select-default">Select Dropdown</Label>
                  <Select id="select-default" defaultValue="">
                    <option value="" disabled>Choose an option</option>
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-disabled">Disabled Select</Label>
                  <Select id="select-disabled" disabled defaultValue="">
                    <option value="">Disabled dropdown</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="textarea-default">Textarea</Label>
                  <Textarea 
                    id="textarea-default" 
                    placeholder="Enter your message..." 
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Checkboxes Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Checkboxes</h2>
            
            <div className="space-y-4">
              <Checkbox label="Default checkbox" />
              <Checkbox label="Checked checkbox" defaultChecked />
              <Checkbox label="Disabled checkbox" disabled />
              <Checkbox label="Disabled checked checkbox" disabled defaultChecked />
            </div>
          </section>

          {/* Form Example Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Form Example</h2>
            
            <div className="max-w-md">
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Name</Label>
                  <Input id="form-name" type="text" placeholder="John Doe" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-email">Email</Label>
                  <Input id="form-email" type="email" placeholder={`john@${APP_CONFIG.domain}`} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-role">Role</Label>
                  <Select id="form-role" defaultValue="">
                    <option value="" disabled>Select your role</option>
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="manager">Manager</option>
                    <option value="other">Other</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-message">Message</Label>
                  <Textarea 
                    id="form-message" 
                    placeholder="Tell us about your project..." 
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <Checkbox label="I agree to the terms and conditions" />
                  <Checkbox label="Send me updates about new features" defaultChecked />
                </div>

                <div className="flex gap-4">
                  <Button variant="orange" type="submit">Submit</Button>
                  <Button variant="outline" type="button">Cancel</Button>
                </div>
              </form>
            </div>
          </section>

          {/* Colors Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch name="Orange 500" color="bg-orange-500" hex="#f97316" />
              <ColorSwatch name="Orange 600" color="bg-orange-600" hex="#ea580c" />
              <ColorSwatch name="Code Black" color="bg-[#36322F]" hex="#36322F" />
              <ColorSwatch name="Zinc 900" color="bg-zinc-900" hex="#18181b" />
              <ColorSwatch name="Zinc 100" color="bg-zinc-100" hex="#f4f4f5" />
              <ColorSwatch name="Zinc 200" color="bg-zinc-200" hex="#e4e4e7" />
              <ColorSwatch name="Red 500" color="bg-red-500" hex="#ef4444" />
              <ColorSwatch name="White" color="bg-white border" hex="#ffffff" />
            </div>
          </section>

          {/* Typography Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Typography</h2>
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold">Heading 1</h1>
                <p className="text-sm text-zinc-500">text-4xl font-bold</p>
              </div>
              <div>
                <h2 className="text-3xl font-semibold">Heading 2</h2>
                <p className="text-sm text-zinc-500">text-3xl font-semibold</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
                <p className="text-sm text-zinc-500">text-2xl font-semibold</p>
              </div>
              <div>
                <p className="text-lg">Large paragraph</p>
                <p className="text-sm text-zinc-500">text-lg</p>
              </div>
              <div>
                <p>Regular paragraph</p>
                <p className="text-sm text-zinc-500">Default size</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Small muted text</p>
                <p className="text-sm text-zinc-500">text-sm text-zinc-500</p>
              </div>
            </div>
          </section>
        </div>
      </MainContent>
      
      <Footer />
    </Layout>
  )
}

function ColorSwatch({ name, color, hex }: { name: string; color: string; hex: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-24 rounded-lg ${color}`} />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-zinc-500">{hex}</p>
      </div>
    </div>
  )
}