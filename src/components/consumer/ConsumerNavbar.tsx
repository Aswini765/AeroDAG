import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  User,
  Check,
  Menu,
  X,
  HelpCircle,
  LogOut,
  Mail,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Currency } from '../../types/travelBooking';
import type { User as SupabaseUser } from '../../services/persistence';

export type FlowStep = 'describe' | 'clarify' | 'plan' | 'review' | 'done' | 'mytrips';

interface ConsumerNavbarProps {
  currentStep: FlowStep;
  onNavigate: (step: FlowStep) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onOpenHowItWorks: () => void;
  hasConfirmedTrips?: boolean;
  authUser?: SupabaseUser | null;
  isAuthAnonymous?: boolean;
  isOfflineMode?: boolean;
  onLinkEmail?: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  onSignOut?: () => Promise<void>;
  /** Opens My Trips on the "Saved plans" tab */
  onOpenSavedPlans?: () => void;
  savedPlansCount?: number;
  myTripsTab?: 'booked' | 'saved';
  onOpenSurvey?: () => void;
}

export const ConsumerNavbar: React.FC<ConsumerNavbarProps> = ({
  currentStep,
  onNavigate,
  currency,
  setCurrency,
  onOpenHowItWorks,
  hasConfirmedTrips = false,
  authUser = null,
  isAuthAnonymous = true,
  isOfflineMode = false,
  onLinkEmail,
  onSignOut,
  onOpenSavedPlans,
  savedPlansCount = 0,
  myTripsTab,
  onOpenSurvey
}) => {
  const onSavedPlansView = currentStep === 'mytrips' && myTripsTab === 'saved';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Email linking state
  const [emailInput, setEmailInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Sign out confirmation
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
        setConfirmSignOut(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !onLinkEmail) return;

    setIsLinking(true);
    setLinkError(null);
    setLinkSuccess(false);

    try {
      const res = await onLinkEmail(emailInput.trim());
      if (res.success) {
        setLinkSuccess(true);
        setLinkMessage(res.message || null);
        setEmailInput('');
      } else {
        setLinkError(res.error || 'Failed to send confirmation link');
      }
    } catch (err: any) {
      setLinkError(err?.message || 'Error sending link');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOutAction = async () => {
    if (!onSignOut) return;
    setIsSigningOut(true);
    try {
      await onSignOut();
      setAccountMenuOpen(false);
      setConfirmSignOut(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Map sub-steps to the 4 canonical progress steps
  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    // 0: Describe, 1: Plan (Clarify/Plan), 2: Review, 3: Done
    let activeIndex = 0;
    if (currentStep === 'clarify' || currentStep === 'plan') activeIndex = 1;
    if (currentStep === 'review') activeIndex = 2;
    if (currentStep === 'done') activeIndex = 3;

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'current';
    return 'upcoming';
  };

  const stepsList = [
    { label: 'Describe', stepKey: 'describe' as FlowStep },
    { label: 'Plan', stepKey: 'plan' as FlowStep },
    { label: 'Review', stepKey: 'review' as FlowStep },
    { label: 'Done', stepKey: 'done' as FlowStep }
  ];

  const showProgressBar = currentStep !== 'describe' && currentStep !== 'mytrips';

  const userDisplayName = authUser?.email ? authUser.email : 'Guest';
  const isUserGuest = isAuthAnonymous || !authUser?.email;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E2E6E1] transition-all">
      {/* Top Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('describe')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:ring-3 focus-visible:ring-[#7CC4B3] rounded-lg p-1"
            aria-label="AeroDAG"
          >
            <div className="h-8 w-8 rounded-lg bg-[#0E6B59] flex items-center justify-center text-white shadow-sm">
              <Send className="h-4 w-4 transform -rotate-45" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#15201D] font-heading">
              AeroDAG
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate('describe')}
              className={`text-sm font-medium transition cursor-pointer ${
                currentStep === 'describe' || currentStep === 'clarify' || currentStep === 'plan'
                  ? 'text-[#0E6B59] font-semibold'
                  : 'text-[#55625E] hover:text-[#15201D]'
              }`}
            >
              Plan a trip
            </button>

            <button
              id="nav-my-trips-btn"
              onClick={() => onNavigate('mytrips')}
              className={`text-sm font-medium transition cursor-pointer relative ${
                currentStep === 'mytrips' && !onSavedPlansView
                  ? 'text-[#0E6B59] font-semibold'
                  : 'text-[#55625E] hover:text-[#15201D]'
              }`}
              aria-current={currentStep === 'mytrips' && !onSavedPlansView ? 'page' : undefined}
            >
              <span>My Trips</span>
            </button>

            {onOpenSavedPlans && (
              <button
                id="nav-saved-plans-btn"
                onClick={onOpenSavedPlans}
                className={`text-sm font-medium transition cursor-pointer inline-flex items-center gap-1.5 ${
                  onSavedPlansView ? 'text-[#0E6B59] font-semibold' : 'text-[#55625E] hover:text-[#15201D]'
                }`}
                aria-current={onSavedPlansView ? 'page' : undefined}
                aria-label={savedPlansCount > 0 ? `Saved plans, ${savedPlansCount}` : 'Saved plans'}
              >
                <span>Saved plans</span>
                {savedPlansCount > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#E3F1EC] text-[#0E6B59] text-[11px] font-bold inline-flex items-center justify-center" data-testid="saved-plans-count">
                    {savedPlansCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onOpenHowItWorks}
              className="text-sm font-medium text-[#55625E] hover:text-[#15201D] transition cursor-pointer"
            >
              How it works
            </button>

            {onOpenSurvey && (
              <button
                type="button"
                id="nav-survey-btn"
                onClick={onOpenSurvey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0E6B59]/30 bg-[#E3F1EC]/60 text-xs font-semibold text-[#0E6B59] hover:bg-[#E3F1EC] transition cursor-pointer"
                aria-label="User Research Survey"
              >
                <span>Research Survey</span>
                <span className="w-2 h-2 rounded-full bg-[#0E6B59] animate-pulse" />
              </button>
            )}

            {/* Currency Pill */}
            <div className="relative">
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E6E1] bg-[#FFFFFF] text-xs font-semibold text-[#15201D] hover:bg-[#F5F6F3] transition cursor-pointer"
                aria-label="Currency ₹ INR"
              >
                <span>₹ INR</span>
              </button>
            </div>

            {/* Account Menu Trigger */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => {
                  setAccountMenuOpen(!accountMenuOpen);
                  setConfirmSignOut(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E2E6E1] bg-[#FFFFFF] text-xs font-semibold text-[#15201D] hover:bg-[#F5F6F3] transition cursor-pointer"
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
                data-testid="account-menu-button"
              >
                <div className="h-5 w-5 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center text-[10px] font-bold">
                  {authUser?.email ? authUser.email.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                </div>
                <span className="max-w-[120px] truncate" data-testid="account-trigger-label">
                  {isUserGuest ? 'Sign in' : userDisplayName}
                </span>
                {isOfflineMode && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" title="Offline mode active" />
                )}
                <ChevronDown className="h-3 w-3 text-[#55625E]" />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#E2E6E1] shadow-xl p-4 z-50 animate-fade-in-slide space-y-4 text-left"
                  data-testid="account-menu-dropdown"
                >
                  {/* Account Identity Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E1]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {authUser?.email ? authUser.email.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#15201D] truncate flex items-center gap-1.5">
                          <span>{userDisplayName}</span>
                          {isUserGuest && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
                              Guest
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#55625E] truncate">
                          {isOfflineMode
                            ? 'Offline device session'
                            : isUserGuest
                            ? 'Anonymous session'
                            : 'Signed in with email'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen(false)}
                      className="text-[#55625E] hover:text-[#15201D] p-1"
                      aria-label="Close menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* "Save my trips with email" (For Guest Users) */}
                  {isUserGuest && (
                    <div className="p-3 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#15201D]">
                        <Mail className="h-3.5 w-3.5 text-[#0E6B59]" />
                        <span>Sign in or keep your trips</span>
                      </div>
                      <p className="text-[11px] text-[#55625E] leading-relaxed">
                        No password — we email you a link. New here? Your trips from this visit are kept. Been here before? You'll get your saved trips back.
                      </p>

                      {linkSuccess ? (
                        <div className="p-2.5 rounded-lg bg-[#E3F1EC] text-[#0E6B59] text-xs font-medium flex items-center gap-2">
                          <Check className="h-4 w-4 flex-shrink-0" />
                          <span>{linkMessage || 'Check your email for the link. Your trips stay saved here meanwhile.'}</span>
                        </div>
                      ) : (
                        <form onSubmit={handleSendMagicLink} className="space-y-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="name@example.com"
                            disabled={isLinking}
                            className="w-full bg-white border border-[#E2E6E1] rounded-lg px-2.5 py-1.5 text-xs text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none placeholder-[#8A9692]"
                            required
                          />
                          {linkError && (
                            <div className="text-[11px] text-red-600">
                              {linkError}
                            </div>
                          )}
                          <button
                            type="submit"
                            disabled={isLinking || !emailInput}
                            className="w-full btn-primary py-1.5 px-3 text-xs justify-center font-medium"
                          >
                            {isLinking ? 'Sending…' : 'Email me a link'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Sign Out Section (signed-in users only; a guest signing out would just lose their trips) */}
                  {!isUserGuest && (
                  <div className="pt-2 border-t border-[#E2E6E1] space-y-2">
                    {isUserGuest && (
                      <p className="text-[11px] text-[#8C4A4A] leading-tight flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[#D97706]" />
                        <span>Without an email, your trips stay on this browser only.</span>
                      </p>
                    )}

                    {confirmSignOut ? (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 space-y-2">
                        <div className="text-xs text-red-800 font-semibold">
                          Confirm sign out?
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSignOutAction}
                            disabled={isSigningOut}
                            className="flex-1 py-1.5 px-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition"
                          >
                            {isSigningOut ? 'Signing out...' : 'Yes, sign out'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSignOut(false)}
                            className="py-1.5 px-2 bg-white border border-[#E2E6E1] text-[#15201D] rounded-lg text-xs font-medium hover:bg-[#F5F6F3] transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmSignOut(true)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center justify-between cursor-pointer"
                        data-testid="sign-out-button"
                      >
                        <span>Sign out</span>
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => onNavigate('mytrips')}
              className="px-3 py-2 min-h-[44px] inline-flex items-center text-xs font-medium text-[#55625E] border border-[#E2E6E1] rounded-full"
            >
              My Trips
            </button>
            {isUserGuest && !isOfflineMode && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="px-3 py-2 min-h-[44px] inline-flex items-center text-xs font-semibold text-[#0E6B59] border border-[#0E6B59]/40 rounded-full"
                data-testid="mobile-sign-in-button"
              >
                Sign in
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#55625E] hover:text-[#15201D]"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E6E1] bg-[#FFFFFF] px-4 py-3 space-y-2 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E1]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center font-bold text-xs">
                {authUser?.email ? authUser.email.charAt(0).toUpperCase() : 'G'}
              </div>
              <span className="text-xs font-bold text-[#15201D]">
                {userDisplayName}
              </span>
            </div>
            {isUserGuest && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
                Guest
              </span>
            )}
          </div>

          <button
            onClick={() => {
              onNavigate('describe');
              setMobileMenuOpen(false);
            }}
            className="flex items-center w-full text-left py-2.5 min-h-[44px] text-sm font-medium text-[#15201D]"
          >
            Plan a trip
          </button>
          <button
            onClick={() => {
              onNavigate('mytrips');
              setMobileMenuOpen(false);
            }}
            className="flex items-center w-full text-left py-2.5 min-h-[44px] text-sm font-medium text-[#15201D]"
          >
            My Trips
          </button>
          {onOpenSavedPlans && (
            <button
              onClick={() => {
                onOpenSavedPlans();
                setMobileMenuOpen(false);
              }}
              className="flex items-center w-full text-left py-2.5 min-h-[44px] text-sm font-medium text-[#15201D]"
            >
              Saved plans{savedPlansCount > 0 ? ` (${savedPlansCount})` : ''}
            </button>
          )}
          <button
            onClick={() => {
              onOpenHowItWorks();
              setMobileMenuOpen(false);
            }}
            className="flex items-center w-full text-left py-2.5 min-h-[44px] text-sm font-medium text-[#15201D]"
          >
            How it works
          </button>
          {onOpenSurvey && (
            <button
              onClick={() => {
                onOpenSurvey();
                setMobileMenuOpen(false);
              }}
              className="flex items-center w-full text-left py-2.5 min-h-[44px] text-sm font-semibold text-[#0E6B59]"
            >
              Research Survey (Feedback)
            </button>
          )}

          {/* Mobile Save Email & Sign out */}
          {isUserGuest && (
            <div className="pt-2 border-t border-[#E2E6E1] space-y-2">
              <div className="text-xs font-bold text-[#15201D]">Sign in or keep your trips</div>
              <p className="text-[11px] text-[#55625E]">
                No password — we email you a link to see your trips on any device.
              </p>
              {linkSuccess ? (
                <div className="p-2.5 rounded-lg bg-[#E3F1EC] text-[#0E6B59] text-xs font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  <span>{linkMessage || 'Check your email for the link. Your trips stay saved here meanwhile.'}</span>
                </div>
              ) : (
                <form onSubmit={handleSendMagicLink} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      className="flex-1 bg-white border border-[#E2E6E1] rounded-lg px-2.5 py-2 min-h-[44px] text-xs text-[#15201D]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLinking || !emailInput}
                      className="btn-primary w-full sm:w-auto py-2 px-3 text-xs min-h-[44px]"
                    >
                      {isLinking ? 'Sending…' : 'Email me a link'}
                    </button>
                  </div>
                  {linkError && (
                    <div className="text-[11px] text-red-600">
                      {linkError}
                    </div>
                  )}
                </form>
              )}
              <p className="text-[11px] text-[#8C4A4A]">
                Without an email, your trips stay on this browser only.
              </p>
            </div>
          )}

          {!isUserGuest && (
            <div className="pt-2 border-t border-[#E2E6E1]">
              <button
                onClick={() => {
                  handleSignOutAction();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-medium text-red-600 py-1"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4-Step Progress Bar Under Header (Shown after the first screen) */}
      {showProgressBar && (
        <div className="border-t border-[#E2E6E1] bg-[#F5F6F3]/60 py-2.5 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {stepsList.map((step, idx) => {
              const status = getStepStatus(idx);
              const isCurrent = status === 'current';
              const isCompleted = status === 'completed';

              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="h-5 w-5 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center text-xs font-bold">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : isCurrent ? (
                      <span className="h-5 w-5 rounded-full bg-[#0E6B59] flex items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-[#E2E6E1] flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#55625E]" />
                      </span>
                    )}

                    <span
                      className={`text-xs ${
                        isCurrent
                          ? 'font-bold text-[#15201D]'
                          : isCompleted
                          ? 'font-medium text-[#0E6B59]'
                          : 'font-medium text-[#55625E]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < stepsList.length - 1 && (
                    <div className="hidden sm:block w-8 md:w-14 h-[1px] bg-[#E2E6E1] mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
