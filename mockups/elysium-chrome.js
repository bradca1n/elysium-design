/**
 * Elysium chrome injector — renders the shared Navbar + Left-Hand Nav
 * into every mockup page, so the shell stays in sync across all HTML files.
 *
 * Usage:
 *   <header class="navbar" data-elysium-navbar></header>
 *   <nav class="sidebar" data-elysium-sidebar data-active="nav-collateral"></nav>
 *   <script src="./elysium-chrome.js" defer></script>
 *
 * Active items supported via data-active: home, actions, communication,
 * overview, nav-collateral, share-register, distribution, economics, benchmarking.
 *
 * Icons are exported directly from the Figma components (Navbar 1065:519502,
 * Left Hand Navigation v2 1065:519504). Stroke / fill colors use currentColor
 * so they inherit from the containing nav-item or logo.
 */
(function () {
  // ---------- Figma-sourced SVGs (currentColor normalised) ----------
  const icons = {
    // POD wordmark + soccer-ball logo (from Figma "Logo, Inline" 341:8908)
    'pod-logo': '<svg viewBox="0 0 116 28" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#elysium-logo-clip)"><path d="M18.5211 14.5089C18.5211 17.4668 16.1246 19.8633 13.1667 19.8633C10.2088 19.8633 7.81228 17.4647 7.81228 14.5089C7.81228 11.553 10.2109 9.15443 13.1667 9.15443C16.1226 9.15443 18.5211 11.551 18.5211 14.5089ZM24.7309 10.7752C26.4068 13.7372 26.5171 17.3341 25.0269 20.394L24.5798 21.3106C22.8488 24.8666 19.6255 27.1223 15.6714 27.1223H10.613C6.65689 27.1223 3.48465 24.8666 1.75359 21.3106L1.30654 20.394C-0.183636 17.3341 -0.0734035 13.7372 1.60253 10.7752L4.14196 5.51268C5.22999 3.58974 6.90389 2.06486 8.92073 1.16259C11.6071 -0.0377171 14.6773 -0.0377171 17.3617 1.16259C19.3785 2.06486 21.0544 3.58974 22.1404 5.51268L24.7289 10.7752M20.4257 16.0868C19.5786 15.2397 19.5786 13.8679 20.4257 13.0207C22.0118 11.4346 22.0118 8.86456 20.4257 7.27844C18.8396 5.69232 16.2695 5.69232 14.6834 7.27844C13.8363 8.12559 12.4645 8.12559 11.6173 7.27844C10.0312 5.69232 7.46117 5.69232 5.87506 7.27844L5.81994 7.33355C4.23382 8.91967 4.31547 11.4326 5.88934 13.033C6.72221 13.8801 6.71813 15.2437 5.8771 16.0848C4.29098 17.6709 4.29098 20.2409 5.8771 21.8271C7.46322 23.4132 10.0333 23.4132 11.6194 21.8271C12.4665 20.9799 13.8383 20.9799 14.6855 21.8271C16.2716 23.4132 18.8416 23.4132 20.4278 21.8271C22.0139 20.2409 22.0139 17.6709 20.4278 16.0848" fill="currentColor"/><path d="M40.9801 16.8586V23.1889H35.0327V4.19807H49.2782C56.0934 4.19807 58.1355 6.90375 58.1355 10.3752V10.6304C58.1355 14.0253 56.0679 16.8586 49.2782 16.8586H40.9801ZM40.9801 12.5959H49.1738C51.0371 12.5959 51.9305 11.8812 51.9305 10.6049V10.5283C51.9305 9.25208 51.0626 8.51185 49.1738 8.51185H40.9801V12.5959ZM87.0046 13.2595V14.0253C87.0046 17.3691 85.6262 23.5207 73.6525 23.5207H72.5549C60.5302 23.5207 59.1774 17.3691 59.1774 14.0253V13.2595C59.1774 9.86469 60.5302 3.86392 72.5549 3.86392H73.6525C85.6007 3.86392 87.0046 9.86236 87.0046 13.2595ZM65.4078 13.4382V13.7445C65.4078 15.9142 66.6841 18.9006 73.091 18.9006C79.4978 18.9006 80.7741 15.9908 80.7741 13.7956V13.4382C80.7741 11.2431 79.4978 8.4608 73.091 8.4608C66.6841 8.4608 65.4078 11.2431 65.4078 13.4382ZM101.58 4.19807C112.583 4.19807 114.983 8.92025 114.983 13.1853V13.9511C114.983 18.0351 112.711 23.2167 101.605 23.1912H88.9932V4.19807H101.58ZM101.12 18.6199C107.859 18.6199 108.752 15.6589 108.752 13.719V13.5659C108.752 11.6259 107.935 8.69052 101.12 8.69052H94.9429V18.6222H101.12V18.6199Z" fill="currentColor"/></g><defs><clipPath id="elysium-logo-clip"><rect width="115.245" height="27.3846" fill="white"/></clipPath></defs></svg>',

    // Nav icons (Lucide-style, from Figma)
    'home': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 21V13.6C9 13.0399 9 12.7599 9.10899 12.546C9.20487 12.3578 9.35785 12.2049 9.54601 12.109C9.75992 12 10.0399 12 10.6 12H13.4C13.9601 12 14.2401 12 14.454 12.109C14.6422 12.2049 14.7951 12.3578 14.891 12.546C15 12.7599 15 13.0399 15 13.6V21M11.0177 2.76401L4.23539 8.03914C3.78202 8.39176 3.55534 8.56807 3.39203 8.78887C3.24737 8.98446 3.1396 9.2048 3.07403 9.43907C3 9.70353 3 9.99071 3 10.5651V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V10.5651C21 9.99071 21 9.70353 20.926 9.43907C20.8604 9.2048 20.7526 8.98446 20.608 8.78887C20.4447 8.56807 20.218 8.39176 19.7646 8.03914L12.9823 2.76401C12.631 2.49076 12.4553 2.35413 12.2613 2.30162C12.0902 2.25528 11.9098 2.25528 11.7387 2.30162C11.5447 2.35413 11.369 2.49076 11.0177 2.76401Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'actions': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H7.8C6.11984 4 5.27976 4 4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 5.63803C3 6.27976 3 7.11984 3 8.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V13M20.1213 3.87868C21.2929 5.05025 21.2929 6.94975 20.1213 8.12132C18.9497 9.29289 17.0503 9.29289 15.8787 8.12132C14.7071 6.94975 14.7071 5.05025 15.8787 3.87868C17.0503 2.70711 18.9497 2.70711 20.1213 3.87868Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'communication': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 8.5H12M7 12H15M7 18V20.3355C7 20.8684 7 21.1348 7.10923 21.2716C7.20422 21.3906 7.34827 21.4599 7.50054 21.4597C7.67563 21.4595 7.88367 21.2931 8.29976 20.9602L10.6852 19.0518C11.1725 18.662 11.4162 18.4671 11.6875 18.3285C11.9282 18.2055 12.1844 18.1156 12.4492 18.0613C12.7477 18 13.0597 18 13.6837 18H16.2C17.8802 18 18.7202 18 19.362 17.673C19.9265 17.3854 20.3854 16.9265 20.673 16.362C21 15.7202 21 14.8802 21 13.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V14C3 14.93 3 15.395 3.10222 15.7765C3.37962 16.8117 4.18827 17.6204 5.22354 17.8978C5.60504 18 6.07003 18 7 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'overview': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.4 3H4.6C4.03995 3 3.75992 3 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3 3.75992 3 4.03995 3 4.6V8.4C3 8.96005 3 9.24008 3.10899 9.45399C3.20487 9.64215 3.35785 9.79513 3.54601 9.89101C3.75992 10 4.03995 10 4.6 10H8.4C8.96005 10 9.24008 10 9.45399 9.89101C9.64215 9.79513 9.79513 9.64215 9.89101 9.45399C10 9.24008 10 8.96005 10 8.4V4.6C10 4.03995 10 3.75992 9.89101 3.54601C9.79513 3.35785 9.64215 3.20487 9.45399 3.10899C9.24008 3 8.96005 3 8.4 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 3H15.6C15.0399 3 14.7599 3 14.546 3.10899C14.3578 3.20487 14.2049 3.35785 14.109 3.54601C14 3.75992 14 4.03995 14 4.6V8.4C14 8.96005 14 9.24008 14.109 9.45399C14.2049 9.64215 14.3578 9.79513 14.546 9.89101C14.7599 10 15.0399 10 15.6 10H19.4C19.9601 10 20.2401 10 20.454 9.89101C20.6422 9.79513 20.7951 9.64215 20.891 9.45399C21 9.24008 21 8.96005 21 8.4V4.6C21 4.03995 21 3.75992 20.891 3.54601C20.7951 3.35785 20.6422 3.20487 20.454 3.10899C20.2401 3 19.9601 3 19.4 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 14H15.6C15.0399 14 14.7599 14 14.546 14.109C14.3578 14.2049 14.2049 14.3578 14.109 14.546C14 14.7599 14 15.0399 14 15.6V19.4C14 19.9601 14 20.2401 14.109 20.454C14.2049 20.6422 14.3578 20.7951 14.546 20.891C14.7599 21 15.0399 21 15.6 21H19.4C19.9601 21 20.2401 21 20.454 20.891C20.6422 20.7951 20.7951 20.6422 20.891 20.454C21 20.2401 21 19.9601 21 19.4V15.6C21 15.0399 21 14.7599 20.891 14.546C20.7951 14.3578 20.6422 14.2049 20.454 14.109C20.2401 14 19.9601 14 19.4 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 14H4.6C4.03995 14 3.75992 14 3.54601 14.109C3.35785 14.2049 3.20487 14.3578 3.10899 14.546C3 14.7599 3 15.0399 3 15.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H8.4C8.96005 21 9.24008 21 9.45399 20.891C9.64215 20.7951 9.79513 20.6422 9.89101 20.454C10 20.2401 10 19.9601 10 19.4V15.6C10 15.0399 10 14.7599 9.89101 14.546C9.79513 14.3578 9.64215 14.2049 9.45399 14.109C9.24008 14 8.96005 14 8.4 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'nav-collateral': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 16C6 18.2091 7.79086 20 10 20H14C16.2091 20 18 18.2091 18 16C18 13.7909 16.2091 12 14 12H10C7.79086 12 6 10.2091 6 8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8M12 2V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'share-register': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 7L11.8845 4.76892C11.5634 4.1268 11.4029 3.80573 11.1634 3.57116C10.9516 3.36373 10.6963 3.20597 10.4161 3.10931C10.0992 3 9.74021 3 9.02229 3H5.2C4.0799 3 3.51984 3 3.09202 3.21799C2.71569 3.40973 2.40973 3.71569 2.21799 4.09202C2 4.51984 2 5.0799 2 6.2V7M2 7H17.2C18.8802 7 19.7202 7 20.362 7.32698C20.9265 7.6146 21.3854 8.07354 21.673 8.63803C22 9.27976 22 10.1198 22 11.8V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'distribution': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2.26953V6.40007C14 6.96012 14 7.24015 14.109 7.45406C14.2049 7.64222 14.3578 7.7952 14.546 7.89108C14.7599 8.00007 15.0399 8.00007 15.6 8.00007H19.7305M16 13H8M16 17H8M10 9H8M14 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9265 19.673 20.362C20 19.7202 20 18.8802 20 17.2V8L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'economics': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3M21 7L15.5657 12.4343C15.3677 12.6323 15.2687 12.7313 15.1545 12.7684C15.0541 12.8011 14.9459 12.8011 14.8455 12.7684C14.7313 12.7313 14.6323 12.6323 14.4343 12.4343L12.5657 10.5657C12.3677 10.3677 12.2687 10.2687 12.1545 10.2316C12.0541 10.1989 11.9459 10.1989 11.8455 10.2316C11.7313 10.2687 11.6323 10.3677 11.4343 10.5657L7 15M21 7H17M21 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'benchmarking': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 10L14.5657 13.4343C14.3677 13.6323 14.2687 13.7313 14.1545 13.7684C14.0541 13.8011 13.9459 13.8011 13.8455 13.7684C13.7313 13.7313 13.6323 13.6323 13.4343 13.4343L10.5657 10.5657C10.3677 10.3677 10.2687 10.2687 10.1545 10.2316C10.0541 10.1989 9.94591 10.1989 9.84549 10.2316C9.73133 10.2687 9.63232 10.3677 9.43431 10.5657L6 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'chevron-selector': '<svg class="fund-selector-caret" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.66666 10L7.99999 13.3333L11.3333 10M4.66666 6L7.99999 2.66667L11.3333 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    // Collateral & Treasury — banknote / vault icon
    'collateral-treasury': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/></svg>',

    // Navbar-right icons (from Figma)
    'bell': '<svg viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.52387 17.7842C7.84344 17.4221 8.39601 17.3876 8.75808 17.7072C9.22105 18.1158 9.82712 18.3628 10.493 18.3628C11.1589 18.3628 11.765 18.1158 12.2279 17.7072C12.59 17.3876 13.1426 17.4221 13.4622 17.7842C13.7817 18.1462 13.7473 18.6988 13.3852 19.0184C12.615 19.6982 11.6012 20.1116 10.493 20.1116C9.38479 20.1116 8.37102 19.6982 7.60082 19.0184C7.23875 18.6988 7.2043 18.1462 7.52387 17.7842Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.16486 2.6672C7.31276 1.5193 8.86964 0.87442 10.493 0.87442C12.1164 0.87442 13.6733 1.5193 14.8212 2.6672C15.9691 3.8151 16.6139 5.37198 16.6139 6.99535C16.6139 9.54225 17.254 11.2309 17.925 12.3093L17.9354 12.326C18.2478 12.828 18.4948 13.225 18.6613 13.5138C18.7447 13.6586 18.8208 13.7981 18.877 13.922C18.9051 13.9839 18.9366 14.0597 18.9611 14.1422C18.9815 14.2106 19.0203 14.3568 19.0058 14.5348C18.996 14.6545 18.9716 14.8588 18.8543 15.07C18.737 15.2812 18.5763 15.4098 18.4799 15.4813C18.2611 15.6437 18.0097 15.6808 17.9259 15.6932L17.922 15.6938C17.7931 15.7129 17.6468 15.7224 17.4993 15.7281C17.2061 15.7395 16.8003 15.7395 16.2955 15.7395H4.6905C4.18576 15.7395 3.77991 15.7395 3.48675 15.7281C3.33919 15.7224 3.19292 15.7129 3.06402 15.6938L3.06015 15.6932C2.97627 15.6808 2.72494 15.6437 2.50608 15.4813C2.40968 15.4098 2.24903 15.2812 2.13172 15.07C2.01442 14.8588 1.99002 14.6545 1.98024 14.5348C1.96568 14.3568 2.00451 14.2106 2.02489 14.1422C2.04945 14.0597 2.08088 13.9839 2.10897 13.922C2.16526 13.7981 2.24127 13.6586 2.32471 13.5138C2.49122 13.2249 2.73823 12.828 3.05068 12.3259L3.06099 12.3093C3.732 11.2309 4.37208 9.54225 4.37208 6.99535C4.37208 5.37198 5.01696 3.8151 6.16486 2.6672Z" fill="currentColor"/></svg>',

    'ceffu': '<svg class="custodian-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.22983 8.04609L1.245 10.0316L6.23521 15.0201L8.22004 13.0346L3.22983 8.04609Z" fill="#1CD264"/><path d="M8.21997 13.0358L10.8845 10.3702C11.981 9.27469 13.7581 9.27469 14.8546 10.3702L10.205 15.0208L8.21997 13.0358Z" fill="#1CD264"/><path d="M6.23655 1.07241L1.24634 6.06088L3.23117 8.04641L8.22139 3.05793L6.23655 1.07241Z" fill="#1CD264"/><path d="M10.205 1.07092L14.8546 5.72159C13.7581 6.81706 11.981 6.81706 10.8845 5.72159L8.21997 3.05599L10.205 1.07092Z" fill="#1CD264"/></svg>',

    'arrow-up-right': '<svg class="custodian-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.66663 11.3333L11.3333 4.66666M11.3333 4.66666H4.66663M11.3333 4.66666V11.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    // Account dropdown icons
    'user-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.667 17.5v-1.667A3.333 3.333 0 0 0 13.333 12.5H6.667a3.333 3.333 0 0 0-3.334 3.333V17.5"/><circle cx="10" cy="5.833" r="3.333"/></svg>',
    'settings-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M16.167 12.5a1.375 1.375 0 0 0 .275 1.517l.05.05a1.667 1.667 0 1 1-2.358 2.358l-.05-.05a1.375 1.375 0 0 0-1.517-.275 1.375 1.375 0 0 0-.834 1.259V17.5a1.667 1.667 0 0 1-3.333 0v-.075a1.375 1.375 0 0 0-.9-1.258 1.375 1.375 0 0 0-1.517.275l-.05.05a1.667 1.667 0 1 1-2.358-2.359l.05-.05a1.375 1.375 0 0 0 .275-1.516 1.375 1.375 0 0 0-1.259-.834H2.5a1.667 1.667 0 0 1 0-3.333h.075a1.375 1.375 0 0 0 1.258-.9 1.375 1.375 0 0 0-.275-1.517l-.05-.05a1.667 1.667 0 1 1 2.359-2.358l.05.05a1.375 1.375 0 0 0 1.516.275H7.5a1.375 1.375 0 0 0 .833-1.259V2.5a1.667 1.667 0 0 1 3.334 0v.075a1.375 1.375 0 0 0 .833 1.258 1.375 1.375 0 0 0 1.517-.275l.05-.05a1.667 1.667 0 1 1 2.358 2.359l-.05.05a1.375 1.375 0 0 0-.275 1.516V7.5a1.375 1.375 0 0 0 1.259.833H17.5a1.667 1.667 0 0 1 0 3.334h-.075a1.375 1.375 0 0 0-1.258.833Z"/></svg>',
    'help-circle': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8.333"/><path d="M7.575 7.5a2.5 2.5 0 0 1 4.858.833c0 1.667-2.5 2.5-2.5 2.5"/><path d="M10 14.167h.008"/></svg>',
    'message-square-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.167c0-1.4 0-2.1.272-2.635A2.5 2.5 0 0 1 3.865 2.44C4.4 2.167 5.1 2.167 6.5 2.167h7c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.093 1.093c.272.535.272 1.235.272 2.635v4.833c0 1.4 0 2.1-.272 2.635a2.5 2.5 0 0 1-1.093 1.093c-.535.272-1.235.272-2.635.272H11l-3.333 2.5v-2.5H6.5c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 0 1-1.093-1.093c-.272-.535-.272-1.235-.272-2.635V6.167Z"/></svg>',
    'sun': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.333"/><path d="M10 1.667v1.666M10 16.667v1.666M3.518 3.518l1.178 1.178M15.304 15.304l1.178 1.178M1.667 10h1.666M16.667 10h1.666M3.518 16.482l1.178-1.178M15.304 4.696l1.178-1.178"/></svg>',
    'moon-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 10.633A7.5 7.5 0 1 1 9.367 2.5a5.833 5.833 0 0 0 8.133 8.133Z"/></svg>',
    'monitor-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.667" y="3.333" width="16.667" height="11.667" rx="1.667"/><path d="M6.667 18.333h6.666M10 15v3.333"/></svg>',
    'log-out-01': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.333 14.167 17.5 10l-4.167-4.167M17.5 10h-10M10 17.5H5A2.5 2.5 0 0 1 2.5 15V5A2.5 2.5 0 0 1 5 2.5h5"/></svg>',

    // Notification row icons
    'notif-warning': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.575 3.217 1.517 15a1.667 1.667 0 0 0 1.425 2.5h14.116a1.667 1.667 0 0 0 1.425-2.5l-7.058-11.783a1.667 1.667 0 0 0-2.85 0Z"/><path d="M10 7.5v3.333M10 14.167h.008"/></svg>',
    'notif-balance': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v16M2 7l3 7h-6l3-7ZM18 7l3 7h-6l3-7Z" transform="scale(0.8) translate(2.5 2)"/><path d="M5 16.667h10"/></svg>',
    'notif-arrow-up': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16.667V3.333M3.333 10 10 3.333 16.667 10"/></svg>',
    'notif-arrow-down': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.333v13.334M3.333 10 10 16.667 16.667 10"/></svg>',
    'notif-clock-alert': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.833V10l2.5 1.667"/></svg>',
    'notif-circle-check': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="m7 10 2 2 4-4"/></svg>',
    'notif-bar-chart': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5v4.167M10 7.5v9.167M15 3.333v13.334"/></svg>',
    'chevron-down': '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>',
  };

  // ---------- Navbar markup ----------
  const navbarHTML = `
    <div class="logo">${icons['pod-logo']}</div>
    <div class="nav-actions">
      <button class="custodian-btn" type="button" aria-label="Ceffu custody">
        ${icons['ceffu']}
        <span>Ceffu</span>
        ${icons['arrow-up-right']}
      </button>
      <button class="icon-btn" type="button" aria-label="Notifications" data-dropdown-trigger="notifications">
        ${icons['bell']}
      </button>
      <div class="avatar-wrap" role="button" aria-label="Account menu" data-dropdown-trigger="account">
        <div class="avatar">JD</div>
        <span class="avatar-status-dot"></span>
      </div>
    </div>
    ${accountDropdownHTML()}
    ${notificationsDropdownHTML()}
  `;

  // ---------- Account dropdown ----------
  function accountDropdownHTML() {
    return `
      <div class="dropdown-panel account-dropdown" data-dropdown="account">
        <div class="account-header">
          <div class="account-avatar">JD</div>
          <div>
            <div class="account-name">Jane Doe</div>
            <div class="account-org">Elysium Capital</div>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" type="button">${icons['user-01']}<span class="label">Your details</span></button>
        <button class="dropdown-item" type="button">${icons['settings-01']}<span class="label">Settings</span></button>
        <button class="dropdown-item" type="button">${icons['help-circle']}<span class="label">Help centre</span></button>
        <button class="dropdown-item" type="button">${icons['message-square-01']}<span class="label">Give Feedback</span></button>
        <div class="dropdown-item" style="cursor:default;">
          ${icons['sun']}
          <span class="label">Theme</span>
          <div class="theme-picker" role="radiogroup" aria-label="Theme">
            <button class="theme-opt active" type="button" aria-label="Light">${icons['sun']}</button>
            <button class="theme-opt" type="button" aria-label="Dark">${icons['moon-01']}</button>
            <button class="theme-opt" type="button" aria-label="System">${icons['monitor-01']}</button>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" type="button">${icons['log-out-01']}<span class="label">Log out</span></button>
      </div>
    `;
  }

  // ---------- Notifications dropdown ----------
  function notificationsDropdownHTML() {
    const rows = [
      { kind: 'warning', icon: 'notif-warning', title: 'Large redemption requested on', fund: 'POD Crypto Fund', tail: ' — requires approval', meta: '10 min ago · Dealing', unread: true, actions: ['Review', 'Approve'] },
      { kind: 'warning', icon: 'notif-balance', title: 'Books require balancing after redemption on', fund: 'POD Crypto Fund', tail: ' — action required', meta: '8 min ago · Reconciliation', unread: true, actions: ['Review', 'Resolve'] },
      { kind: 'standard', icon: 'notif-arrow-up', title: 'Jane Doe subscribed to', fund: 'POD Crypto Fund', meta: '15 min ago · Dealing', unread: true, amount: { val: '+2,500,000 USD', label: 'Subscription amount' } },
      { kind: 'standard', icon: 'notif-arrow-down', title: 'Redemption processed for', fund: 'POD Crypto Fund', meta: '32 min ago · Dealing', unread: true, amount: { val: '−800,000 USD', label: 'Redemption amount' } },
      { kind: 'standard', icon: 'notif-clock-alert', title: 'Dealing cutoff approaching on', fund: 'POD Crypto Fund', meta: '45 min ago · Dealing', unread: true, amount: { val: '1 hour remaining', label: 'To next cutoff' } },
      { kind: 'standard', icon: 'notif-clock-alert', title: 'Dealing cutoff closed on', fund: 'POD Crypto Fund', meta: '2 hours ago · Dealing', unread: false, amount: { val: '13:00 UTC', label: 'Today\u2019s cutoff' } },
      { kind: 'standard', icon: 'notif-circle-check', title: 'Settlement completed for', fund: 'POD Crypto Fund', meta: '3 hours ago · Settlement', unread: false, amount: { val: '3,200,000 USD · 142 units', label: 'Settled amount' } },
      { kind: 'standard', icon: 'notif-bar-chart', title: 'NAV published for', fund: 'POD Crypto Fund', meta: '4 hours ago · Valuation', unread: false, amount: { val: '$47,460,000 · +5.2%', label: 'Daily NAV' } },
    ];
    return `
      <div class="dropdown-panel notifications-dropdown" data-dropdown="notifications">
        <div class="notif-head">Notifications</div>
        <div class="notif-tabs">
          <button class="notif-tab active" type="button">Unread</button>
          <button class="notif-tab" type="button">Read</button>
        </div>
        <div class="notif-controls">
          <button class="notif-filter" type="button">All funds ${icons['chevron-down']}</button>
          <button class="notif-mark-read" type="button">Mark all as read</button>
        </div>
        <div class="notif-list">
          ${rows.map(notifRowHTML).join('')}
        </div>
      </div>
    `;
  }

  function notifRowHTML(row) {
    const warnClass = row.kind === 'warning' ? ' notif-row--warning' : '';
    const unreadDot = row.unread ? '<span class="notif-unread-dot"></span>' : '';
    const titleClass = row.kind === 'warning' ? 'notif-title' : 'notif-title notif-title--regular';
    const tail = row.tail || '';
    const fundPill = `<span class="notif-fund-pill">${row.fund}</span>`;
    const actions = row.actions
      ? `<div class="notif-actions"><button class="btn btn-outline btn-sm">${row.actions[0]}</button><button class="btn btn-primary btn-sm">${row.actions[1]}</button></div>`
      : '';
    const amount = row.amount
      ? `<div class="notif-amount"><div class="notif-amount-val">${row.amount.val}</div><div class="notif-amount-label">${row.amount.label}</div></div>`
      : '';
    return `
      <div class="notif-row${warnClass}">
        <div class="notif-icon-box">${icons[row.icon]}${unreadDot}</div>
        <div class="notif-body">
          <div class="${titleClass}">${row.title} ${fundPill}${tail}</div>
          <div class="notif-meta">${row.meta}</div>
          ${amount}
          ${actions}
        </div>
      </div>
    `;
  }

  // ---------- Left-hand nav items ----------
  const navItems = {
    primary: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'actions', label: 'Actions', icon: 'actions' },
      { id: 'communication', label: 'Communication', icon: 'communication' },
    ],
    fund: [
      { id: 'overview', label: 'Overview', icon: 'overview' },
      { id: 'nav', label: 'NAV', icon: 'nav-collateral' },
      { id: 'collateral-treasury', label: 'Collateral & Treasury', icon: 'collateral-treasury' },
      { id: 'share-register', label: 'Share Register', icon: 'share-register' },
      { id: 'distribution', label: 'Distribution', icon: 'distribution' },
      { id: 'economics', label: 'Economics', icon: 'economics' },
      { id: 'benchmarking', label: 'Benchmarking', icon: 'benchmarking' },
    ],
  };

  const itemHref = {
    'nav': './nav-collateral.html',
    'collateral-treasury': './collateral-treasury.html',
  };

  function renderNavItem(item, active) {
    const cls = `nav-item${active === item.id ? ' active' : ''}`;
    const href = itemHref[item.id] || '#';
    return `<a href="${href}" class="${cls}">${icons[item.icon] || ''}<span>${item.label}</span></a>`;
  }

  function sidebarHTML(active) {
    return `
      <div class="nav-group">
        ${navItems.primary.map(i => renderNavItem(i, active)).join('\n')}
      </div>
      <div class="nav-fund-block">
        <div class="nav-group nav-group--funds">
          <div class="nav-group-label">Funds</div>
          <div class="fund-selector">
            <div class="fund-selector-info">
              <div class="fund-avatar"></div>
              <span class="fund-selector-name">POD Crypto Fund</span>
            </div>
            ${icons['chevron-selector']}
          </div>
        </div>
        <div class="nav-group">
          ${navItems.fund.map(i => renderNavItem(i, active)).join('\n')}
        </div>
      </div>
    `;
  }

  // ---------- Theme (light / dark / system) ----------
  const THEME_KEY = 'elysium-theme';
  const THEMES = ['light', 'dark', 'system'];
  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  function resolveTheme(choice) {
    if (choice === 'system') return darkMQ.matches ? 'dark' : 'light';
    return choice;
  }
  function applyTheme(choice) {
    const resolved = resolveTheme(choice);
    document.documentElement.dataset.theme = resolved;
    try { localStorage.setItem(THEME_KEY, choice); } catch (e) { /* ignore */ }
  }
  function currentChoice() {
    try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
  }

  // Apply immediately (before DOM ready) so the page doesn't flash.
  applyTheme(currentChoice());

  // React to system changes if user chose "system"
  if (darkMQ.addEventListener) {
    darkMQ.addEventListener('change', () => {
      if (currentChoice() === 'system') applyTheme('system');
    });
  }

  // ---------- Dropdown toggle behavior ----------
  function wireDropdowns(root) {
    const dropdowns = root.querySelectorAll('[data-dropdown]');
    const triggers = root.querySelectorAll('[data-dropdown-trigger]');

    function closeAll() {
      dropdowns.forEach(d => d.removeAttribute('data-open'));
    }
    function toggle(name) {
      dropdowns.forEach(d => {
        if (d.dataset.dropdown === name) {
          d.dataset.open = d.dataset.open === 'true' ? 'false' : 'true';
        } else {
          d.removeAttribute('data-open');
        }
      });
    }

    triggers.forEach(t => {
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle(t.dataset.dropdownTrigger);
      });
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      const inDropdown = e.target.closest('[data-dropdown]');
      const onTrigger = e.target.closest('[data-dropdown-trigger]');
      if (!inDropdown && !onTrigger) closeAll();
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });

    // Theme picker — light / dark / system in that order
    const themeOpts = root.querySelectorAll('.theme-opt');
    // Reflect the persisted choice in the UI
    const savedChoice = currentChoice();
    themeOpts.forEach((btn, i) => {
      btn.classList.toggle('active', THEMES[i] === savedChoice);
    });
    themeOpts.forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeOpts.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme(THEMES[i]);
      });
    });

    // Notification tabs toggle (visual only)
    const notifTabs = root.querySelectorAll('.notif-tab');
    notifTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ---------- Inject ----------
  function inject() {
    const nav = document.querySelector('[data-elysium-navbar]');
    if (nav && !nav.hasChildNodes()) nav.innerHTML = navbarHTML;

    const side = document.querySelector('[data-elysium-sidebar]');
    if (side && !side.hasChildNodes()) {
      const active = side.dataset.active || '';
      side.innerHTML = sidebarHTML(active);
    }

    if (nav) wireDropdowns(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
