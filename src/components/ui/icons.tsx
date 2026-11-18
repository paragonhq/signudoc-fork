// App-wide icon set, backed by Hugeicons (stroke-rounded, free set).
// Import icons from here, never from an icon package directly.
import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import {
  HugeiconsIcon,
  type HugeiconsProps,
  type IconSvgElement,
} from "@hugeicons/react";
import {
  Agreement02Icon as HugeAgreement02Icon,
  AlarmClockOffIcon as HugeAlarmClockOffIcon,
  Alert02Icon as HugeAlert02Icon,
  AlertCircleIcon as HugeAlertCircleIcon,
  AlignBottomIcon as HugeAlignBottomIcon,
  AlignHorizontalCenterIcon as HugeAlignHorizontalCenterIcon,
  AlignLeftIcon as HugeAlignLeftIcon,
  AlignRightIcon as HugeAlignRightIcon,
  AlignTopIcon as HugeAlignTopIcon,
  AlignVerticalCenterIcon as HugeAlignVerticalCenterIcon,
  Archive02Icon as HugeArchive02Icon,
  ArrowDown01Icon as HugeArrowDown01Icon,
  ArrowDown02Icon as HugeArrowDown02Icon,
  ArrowLeft01Icon as HugeArrowLeft01Icon,
  ArrowLeft02Icon as HugeArrowLeft02Icon,
  ArrowRight01Icon as HugeArrowRight01Icon,
  ArrowRight02Icon as HugeArrowRight02Icon,
  ArrowTurnBackwardIcon as HugeArrowTurnBackwardIcon,
  ArrowUp01Icon as HugeArrowUp01Icon,
  ArrowUp02Icon as HugeArrowUp02Icon,
  ArrowUpRight01Icon as HugeArrowUpRight01Icon,
  Building03Icon as HugeBuilding03Icon,
  Calendar03Icon as HugeCalendar03Icon,
  CalendarCheckOut01Icon as HugeCalendarCheckOut01Icon,
  Cancel01Icon as HugeCancel01Icon,
  CancelCircleIcon as HugeCancelCircleIcon,
  CheckmarkBadge01Icon as HugeCheckmarkBadge01Icon,
  CheckmarkCircle02Icon as HugeCheckmarkCircle02Icon,
  CheckmarkSquare02Icon as HugeCheckmarkSquare02Icon,
  CircleOffIcon as HugeCircleOffIcon,
  Clock01Icon as HugeClock01Icon,
  CloudOffIcon as HugeCloudOffIcon,
  ComputerPhoneSyncIcon as HugeComputerPhoneSyncIcon,
  Copy01Icon as HugeCopy01Icon,
  CopyPlusIcon as HugeCopyPlusIcon,
  DashboardSquare02Icon as HugeDashboardSquare02Icon,
  Database01Icon as HugeDatabase01Icon,
  Delete02Icon as HugeDelete02Icon,
  Door01Icon as HugeDoor01Icon,
  Download04Icon as HugeDownload04Icon,
  DragDropVerticalIcon as HugeDragDropVerticalIcon,
  EraserIcon as HugeEraserIcon,
  File02Icon as HugeFile02Icon,
  FileAddIcon as HugeFileAddIcon,
  FileClockIcon as HugeFileClockIcon,
  FileCodeIcon as HugeFileCodeIcon,
  FileEditIcon as HugeFileEditIcon,
  FileRemoveIcon as HugeFileRemoveIcon,
  FileUnknownIcon as HugeFileUnknownIcon,
  FileUploadIcon as HugeFileUploadIcon,
  FileVerifiedIcon as HugeFileVerifiedIcon,
  Files02Icon as HugeFiles02Icon,
  GitPullRequestIcon as HugeGitPullRequestIcon,
  GridIcon as HugeGridIcon,
  ImageUploadIcon as HugeImageUploadIcon,
  InformationCircleIcon as HugeInformationCircleIcon,
  JusticeScale01Icon as HugeJusticeScale01Icon,
  Key01Icon as HugeKey01Icon,
  KeyboardIcon as HugeKeyboardIcon,
  LayoutTemplateIcon as HugeLayoutTemplateIcon,
  LibraryIcon as HugeLibraryIcon,
  LinkSquare02Icon as HugeLinkSquare02Icon,
  Login03Icon as HugeLogin03Icon,
  Logout03Icon as HugeLogout03Icon,
  Mail01Icon as HugeMail01Icon,
  MailBlockIcon as HugeMailBlockIcon,
  MailQuestionMarkIcon as HugeMailQuestionMarkIcon,
  MailRemove01Icon as HugeMailRemove01Icon,
  MailValidation01Icon as HugeMailValidation01Icon,
  MinusSignIcon as HugeMinusSignIcon,
  MoreHorizontalIcon as HugeMoreHorizontalIcon,
  Notification01Icon as HugeNotification01Icon,
  NotificationSquareIcon as HugeNotificationSquareIcon,
  PaintBoardIcon as HugePaintBoardIcon,
  PenTool03Icon as HugePenTool03Icon,
  PencilEdit02Icon as HugePencilEdit02Icon,
  PencilIcon as HugePencilIcon,
  PlusSignIcon as HugePlusSignIcon,
  RecordIcon as HugeRecordIcon,
  RedoIcon as HugeRedoIcon,
  RefreshIcon as HugeRefreshIcon,
  RotateLeft01Icon as HugeRotateLeft01Icon,
  RotateRight01Icon as HugeRotateRight01Icon,
  RulerIcon as HugeRulerIcon,
  ScrollIcon as HugeScrollIcon,
  Search01Icon as HugeSearch01Icon,
  SecurityCheckIcon as HugeSecurityCheckIcon,
  SentIcon as HugeSentIcon,
  Settings02Icon as HugeSettings02Icon,
  Moon02Icon as HugeMoon02Icon,
  Sun03Icon as HugeSun03Icon,
  Shield02Icon as HugeShield02Icon,
  ShieldBlockchainIcon as HugeShieldBlockchainIcon,
  ShieldEnergyIcon as HugeShieldEnergyIcon,
  SignatureIcon as HugeSignatureIcon,
  SlidersHorizontalIcon as HugeSlidersHorizontalIcon,
  SmartPhone01Icon as HugeSmartPhone01Icon,
  SmartphoneNfcIcon as HugeSmartphoneNfcIcon,
  SquareLock02Icon as HugeSquareLock02Icon,
  TextFontIcon as HugeTextFontIcon,
  TextIcon as HugeTextIcon,
  Tick02Icon as HugeTick02Icon,
  TickDouble02Icon as HugeTickDouble02Icon,
  Timer02Icon as HugeTimer02Icon,
  UnavailableIcon as HugeUnavailableIcon,
  UndoIcon as HugeUndoIcon,
  UnfoldMoreIcon as HugeUnfoldMoreIcon,
  Upload04Icon as HugeUpload04Icon,
  UserCheck01Icon as HugeUserCheck01Icon,
  UserEdit01Icon as HugeUserEdit01Icon,
  UserGroupIcon as HugeUserGroupIcon,
  UserIcon as HugeUserIcon,
  UserRemove01Icon as HugeUserRemove01Icon,
  ViewIcon as HugeViewIcon,
  TextBoldIcon as HugeTextBoldIcon,
  TextItalicIcon as HugeTextItalicIcon,
  TextUnderlineIcon as HugeTextUnderlineIcon,
  TextStrikethroughIcon as HugeTextStrikethroughIcon,
  TextSubscriptIcon as HugeTextSubscriptIcon,
  TextSuperscriptIcon as HugeTextSuperscriptIcon,
  TextColorIcon as HugeTextColorIcon,
  HighlighterIcon as HugeHighlighterIcon,
  TextClearIcon as HugeTextClearIcon,
  TextAlignLeftIcon as HugeTextAlignLeftIcon,
  TextAlignCenterIcon as HugeTextAlignCenterIcon,
  TextAlignRightIcon as HugeTextAlignRightIcon,
  TextAlignJustifyCenterIcon as HugeTextAlignJustifyCenterIcon,
  LeftToRightListBulletIcon as HugeLeftToRightListBulletIcon,
  LeftToRightListNumberIcon as HugeLeftToRightListNumberIcon,
  CheckListIcon as HugeCheckListIcon,
  TextIndentMoreIcon as HugeTextIndentMoreIcon,
  TextIndentLessIcon as HugeTextIndentLessIcon,
  Link01Icon as HugeLink01Icon,
  Unlink01Icon as HugeUnlink01Icon,
  ImageAdd01Icon as HugeImageAdd01Icon,
  Table01Icon as HugeTable01Icon,
  QuoteDownIcon as HugeQuoteDownIcon,
  SourceCodeIcon as HugeSourceCodeIcon,
  ParagraphIcon as HugeParagraphIcon,
  FileImportIcon as HugeFileImportIcon,
  Scissor01Icon as HugeScissor01Icon,
  ClipboardIcon as HugeClipboardIcon,
  ClipboardPasteIcon as HugeClipboardPasteIcon,
  ZoomInIcon as HugeZoomInIcon,
  ZoomOutIcon as HugeZoomOutIcon,
  InsertRowUpIcon as HugeInsertRowUpIcon,
  InsertRowDownIcon as HugeInsertRowDownIcon,
  InsertColumnLeftIcon as HugeInsertColumnLeftIcon,
  InsertColumnRightIcon as HugeInsertColumnRightIcon,
  DeleteRowIcon as HugeDeleteRowIcon,
  DeleteColumnIcon as HugeDeleteColumnIcon,
  PaintBrush01Icon as HugePaintBrush01Icon,
  TextSelectionIcon as HugeTextSelectionIcon,
  MoreVerticalIcon as HugeMoreVerticalIcon,
} from "@hugeicons/core-free-icons";

export type IconProps = Omit<HugeiconsProps, "icon" | "ref">;
export type IconComponent = ForwardRefExoticComponent<
  IconProps & RefAttributes<SVGSVGElement>
>;

function create(svg: IconSvgElement, name: string): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(props, ref) {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={svg}
        strokeWidth={1.75}
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}

export const AlarmClockOffIcon = create(
  HugeAlarmClockOffIcon,
  "AlarmClockOffIcon",
);
export const AlarmClockOff = AlarmClockOffIcon;
export const AlignCenterHorizontalIcon = create(
  HugeAlignHorizontalCenterIcon,
  "AlignCenterHorizontalIcon",
);
export const AlignCenterHorizontal = AlignCenterHorizontalIcon;
export const AlignCenterVerticalIcon = create(
  HugeAlignVerticalCenterIcon,
  "AlignCenterVerticalIcon",
);
export const AlignCenterVertical = AlignCenterVerticalIcon;
export const AlignEndHorizontalIcon = create(
  HugeAlignBottomIcon,
  "AlignEndHorizontalIcon",
);
export const AlignEndHorizontal = AlignEndHorizontalIcon;
export const AlignEndVerticalIcon = create(
  HugeAlignRightIcon,
  "AlignEndVerticalIcon",
);
export const AlignEndVertical = AlignEndVerticalIcon;
export const AlignStartHorizontalIcon = create(
  HugeAlignTopIcon,
  "AlignStartHorizontalIcon",
);
export const AlignStartHorizontal = AlignStartHorizontalIcon;
export const AlignStartVerticalIcon = create(
  HugeAlignLeftIcon,
  "AlignStartVerticalIcon",
);
export const AlignStartVertical = AlignStartVerticalIcon;
export const ArchiveIcon = create(HugeArchive02Icon, "ArchiveIcon");
export const Archive = ArchiveIcon;
export const ArrowDownIcon = create(HugeArrowDown02Icon, "ArrowDownIcon");
export const ArrowDown = ArrowDownIcon;
export const ArrowLeftIcon = create(HugeArrowLeft02Icon, "ArrowLeftIcon");
export const ArrowLeft = ArrowLeftIcon;
export const ArrowRightIcon = create(HugeArrowRight02Icon, "ArrowRightIcon");
export const ArrowRight = ArrowRightIcon;
export const ArrowUpIcon = create(HugeArrowUp02Icon, "ArrowUpIcon");
export const ArrowUp = ArrowUpIcon;
export const ArrowUpRightIcon = create(
  HugeArrowUpRight01Icon,
  "ArrowUpRightIcon",
);
export const ArrowUpRight = ArrowUpRightIcon;
export const BadgeCheckIcon = create(
  HugeCheckmarkBadge01Icon,
  "BadgeCheckIcon",
);
export const BadgeCheck = BadgeCheckIcon;
export const BanIcon = create(HugeUnavailableIcon, "BanIcon");
export const Ban = BanIcon;
export const BellIcon = create(HugeNotification01Icon, "BellIcon");
export const Bell = BellIcon;
export const BellRingIcon = create(HugeNotificationSquareIcon, "BellRingIcon");
export const BellRing = BellRingIcon;
export const Building2Icon = create(HugeBuilding03Icon, "Building2Icon");
export const Building2 = Building2Icon;
export const CalendarClockIcon = create(
  HugeCalendarCheckOut01Icon,
  "CalendarClockIcon",
);
export const CalendarClock = CalendarClockIcon;
export const CalendarDaysIcon = create(HugeCalendar03Icon, "CalendarDaysIcon");
export const CalendarDays = CalendarDaysIcon;
export const CaseSensitiveIcon = create(HugeTextFontIcon, "CaseSensitiveIcon");
export const CaseSensitive = CaseSensitiveIcon;
export const CheckIcon = create(HugeTick02Icon, "CheckIcon");
export const Check = CheckIcon;
export const CheckCheckIcon = create(HugeTickDouble02Icon, "CheckCheckIcon");
export const CheckCheck = CheckCheckIcon;
export const ChevronDownIcon = create(HugeArrowDown01Icon, "ChevronDownIcon");
export const ChevronDown = ChevronDownIcon;
export const ChevronLeftIcon = create(HugeArrowLeft01Icon, "ChevronLeftIcon");
export const ChevronLeft = ChevronLeftIcon;
export const ChevronRightIcon = create(
  HugeArrowRight01Icon,
  "ChevronRightIcon",
);
export const ChevronRight = ChevronRightIcon;
export const ChevronUpIcon = create(HugeArrowUp01Icon, "ChevronUpIcon");
export const ChevronUp = ChevronUpIcon;
export const ChevronsUpDownIcon = create(
  HugeUnfoldMoreIcon,
  "ChevronsUpDownIcon",
);
export const ChevronsUpDown = ChevronsUpDownIcon;
export const CircleAlertIcon = create(HugeAlertCircleIcon, "CircleAlertIcon");
export const CircleAlert = CircleAlertIcon;
export const CircleCheckIcon = create(
  HugeCheckmarkCircle02Icon,
  "CircleCheckIcon",
);
export const CircleCheck = CircleCheckIcon;
export const CircleDotIcon = create(HugeRecordIcon, "CircleDotIcon");
export const CircleDot = CircleDotIcon;
export const CircleOffIcon = create(HugeCircleOffIcon, "CircleOffIcon");
export const CircleOff = CircleOffIcon;
export const CircleXIcon = create(HugeCancelCircleIcon, "CircleXIcon");
export const CircleX = CircleXIcon;
export const ClockIcon = create(HugeClock01Icon, "ClockIcon");
export const Clock = ClockIcon;
export const CloudOffIcon = create(HugeCloudOffIcon, "CloudOffIcon");
export const CloudOff = CloudOffIcon;
export const CopyIcon = create(HugeCopy01Icon, "CopyIcon");
export const Copy = CopyIcon;
export const CopyPlusIcon = create(HugeCopyPlusIcon, "CopyPlusIcon");
export const CopyPlus = CopyPlusIcon;
export const CornerDownLeftIcon = create(
  HugeArrowTurnBackwardIcon,
  "CornerDownLeftIcon",
);
export const CornerDownLeft = CornerDownLeftIcon;
export const DatabaseIcon = create(HugeDatabase01Icon, "DatabaseIcon");
export const Database = DatabaseIcon;
export const DoorOpenIcon = create(HugeDoor01Icon, "DoorOpenIcon");
export const DoorOpen = DoorOpenIcon;
export const DownloadIcon = create(HugeDownload04Icon, "DownloadIcon");
export const Download = DownloadIcon;
export const EllipsisIcon = create(HugeMoreHorizontalIcon, "EllipsisIcon");
export const Ellipsis = EllipsisIcon;
export const EraserIcon = create(HugeEraserIcon, "EraserIcon");
export const Eraser = EraserIcon;
export const ExternalLinkIcon = create(
  HugeLinkSquare02Icon,
  "ExternalLinkIcon",
);
export const ExternalLink = ExternalLinkIcon;
export const EyeIcon = create(HugeViewIcon, "EyeIcon");
export const Eye = EyeIcon;
export const FileBadge2Icon = create(HugeFileVerifiedIcon, "FileBadge2Icon");
export const FileBadge2 = FileBadge2Icon;
export const FileClockIcon = create(HugeFileClockIcon, "FileClockIcon");
export const FileClock = FileClockIcon;
export const FileJsonIcon = create(HugeFileCodeIcon, "FileJsonIcon");
export const FileJson = FileJsonIcon;
export const FilePlus2Icon = create(HugeFileAddIcon, "FilePlus2Icon");
export const FilePlus2 = FilePlus2Icon;
export const FileQuestionIcon = create(HugeFileUnknownIcon, "FileQuestionIcon");
export const FileQuestion = FileQuestionIcon;
export const FileSignatureIcon = create(HugeFileEditIcon, "FileSignatureIcon");
export const FileSignature = FileSignatureIcon;
export const FileStackIcon = create(HugeFiles02Icon, "FileStackIcon");
export const FileStack = FileStackIcon;
export const FileTextIcon = create(HugeFile02Icon, "FileTextIcon");
export const FileText = FileTextIcon;
export const FileUpIcon = create(HugeFileUploadIcon, "FileUpIcon");
export const FileUp = FileUpIcon;
export const FileX2Icon = create(HugeFileRemoveIcon, "FileX2Icon");
export const FileX2 = FileX2Icon;
export const GitPullRequestArrowIcon = create(
  HugeGitPullRequestIcon,
  "GitPullRequestArrowIcon",
);
export const GitPullRequestArrow = GitPullRequestArrowIcon;
export const GripVerticalIcon = create(
  HugeDragDropVerticalIcon,
  "GripVerticalIcon",
);
export const GripVertical = GripVerticalIcon;
export const HandshakeIcon = create(HugeAgreement02Icon, "HandshakeIcon");
export const Handshake = HandshakeIcon;
export const HashIcon = create(HugeGridIcon, "HashIcon");
export const Hash = HashIcon;
export const ImageUpIcon = create(HugeImageUploadIcon, "ImageUpIcon");
export const ImageUp = ImageUpIcon;
export const InfoIcon = create(HugeInformationCircleIcon, "InfoIcon");
export const Info = InfoIcon;
export const KeyRoundIcon = create(HugeKey01Icon, "KeyRoundIcon");
export const KeyRound = KeyRoundIcon;
export const KeyboardIcon = create(HugeKeyboardIcon, "KeyboardIcon");
export const Keyboard = KeyboardIcon;
export const LayoutDashboardIcon = create(
  HugeDashboardSquare02Icon,
  "LayoutDashboardIcon",
);
export const LayoutDashboard = LayoutDashboardIcon;
export const LayoutTemplateIcon = create(
  HugeLayoutTemplateIcon,
  "LayoutTemplateIcon",
);
export const LayoutTemplate = LayoutTemplateIcon;
export const LibraryBigIcon = create(HugeLibraryIcon, "LibraryBigIcon");
export const LibraryBig = LibraryBigIcon;
export const LockIcon = create(HugeSquareLock02Icon, "LockIcon");
export const Lock = LockIcon;
export const LogInIcon = create(HugeLogin03Icon, "LogInIcon");
export const LogIn = LogInIcon;
export const LogOutIcon = create(HugeLogout03Icon, "LogOutIcon");
export const LogOut = LogOutIcon;
export const MailIcon = create(HugeMail01Icon, "MailIcon");
export const Mail = MailIcon;
export const MailCheckIcon = create(HugeMailValidation01Icon, "MailCheckIcon");
export const MailCheck = MailCheckIcon;
export const MailQuestionMarkIcon = create(
  HugeMailQuestionMarkIcon,
  "MailQuestionMarkIcon",
);
export const MailQuestionMark = MailQuestionMarkIcon;
export const MailWarningIcon = create(HugeMailBlockIcon, "MailWarningIcon");
export const MailWarning = MailWarningIcon;
export const MailXIcon = create(HugeMailRemove01Icon, "MailXIcon");
export const MailX = MailXIcon;
export const MinusIcon = create(HugeMinusSignIcon, "MinusIcon");
export const Minus = MinusIcon;
export const MonitorSmartphoneIcon = create(
  HugeComputerPhoneSyncIcon,
  "MonitorSmartphoneIcon",
);
export const MonitorSmartphone = MonitorSmartphoneIcon;
export const MoreHorizontalIcon = create(
  HugeMoreHorizontalIcon,
  "MoreHorizontalIcon",
);
export const MoreHorizontal = MoreHorizontalIcon;
export const PaletteIcon = create(HugePaintBoardIcon, "PaletteIcon");
export const Palette = PaletteIcon;
export const PenLineIcon = create(HugePenTool03Icon, "PenLineIcon");
export const PenLine = PenLineIcon;
export const PencilIcon = create(HugePencilIcon, "PencilIcon");
export const Pencil = PencilIcon;
export const PencilLineIcon = create(HugePencilEdit02Icon, "PencilLineIcon");
export const PencilLine = PencilLineIcon;
export const PencilRulerIcon = create(HugeRulerIcon, "PencilRulerIcon");
export const PencilRuler = PencilRulerIcon;
export const PlusIcon = create(HugePlusSignIcon, "PlusIcon");
export const Plus = PlusIcon;
export const Redo2Icon = create(HugeRedoIcon, "Redo2Icon");
export const Redo2 = Redo2Icon;
export const RefreshCwIcon = create(HugeRefreshIcon, "RefreshCwIcon");
export const RefreshCw = RefreshCwIcon;
export const RotateCcwIcon = create(HugeRotateLeft01Icon, "RotateCcwIcon");
export const RotateCcw = RotateCcwIcon;
export const RotateCwIcon = create(HugeRotateRight01Icon, "RotateCwIcon");
export const RotateCw = RotateCwIcon;
export const ScaleIcon = create(HugeJusticeScale01Icon, "ScaleIcon");
export const Scale = ScaleIcon;
export const ScrollTextIcon = create(HugeScrollIcon, "ScrollTextIcon");
export const ScrollText = ScrollTextIcon;
export const SearchIcon = create(HugeSearch01Icon, "SearchIcon");
export const Search = SearchIcon;
export const SendIcon = create(HugeSentIcon, "SendIcon");
export const Send = SendIcon;
export const SettingsIcon = create(HugeSettings02Icon, "SettingsIcon");
export const Settings = SettingsIcon;
export const MoonIcon = create(HugeMoon02Icon, "MoonIcon");
export const SunIcon = create(HugeSun03Icon, "SunIcon");
export const ShieldAlertIcon = create(HugeShield02Icon, "ShieldAlertIcon");
export const ShieldAlert = ShieldAlertIcon;
export const ShieldCheckIcon = create(HugeSecurityCheckIcon, "ShieldCheckIcon");
export const ShieldCheck = ShieldCheckIcon;
export const ShieldMinusIcon = create(
  HugeShieldBlockchainIcon,
  "ShieldMinusIcon",
);
export const ShieldMinus = ShieldMinusIcon;
export const ShieldPlusIcon = create(HugeShieldEnergyIcon, "ShieldPlusIcon");
export const ShieldPlus = ShieldPlusIcon;
export const SignatureIcon = create(HugeSignatureIcon, "SignatureIcon");
export const Signature = SignatureIcon;
export const SlidersHorizontalIcon = create(
  HugeSlidersHorizontalIcon,
  "SlidersHorizontalIcon",
);
export const SlidersHorizontal = SlidersHorizontalIcon;
export const SmartphoneIcon = create(HugeSmartPhone01Icon, "SmartphoneIcon");
export const Smartphone = SmartphoneIcon;
export const SmartphoneNfcIcon = create(
  HugeSmartphoneNfcIcon,
  "SmartphoneNfcIcon",
);
export const SmartphoneNfc = SmartphoneNfcIcon;
export const SquareCheckIcon = create(
  HugeCheckmarkSquare02Icon,
  "SquareCheckIcon",
);
export const SquareCheck = SquareCheckIcon;
export const SquareChevronDownIcon = create(
  HugeArrowDown01Icon,
  "SquareChevronDownIcon",
);
export const SquareChevronDown = SquareChevronDownIcon;
export const TimerIcon = create(HugeTimer02Icon, "TimerIcon");
export const Timer = TimerIcon;
export const Trash2Icon = create(HugeDelete02Icon, "Trash2Icon");
export const Trash2 = Trash2Icon;
export const TriangleAlertIcon = create(HugeAlert02Icon, "TriangleAlertIcon");
export const TriangleAlert = TriangleAlertIcon;
export const TypeIcon = create(HugeTextIcon, "TypeIcon");
export const Type = TypeIcon;
export const Undo2Icon = create(HugeUndoIcon, "Undo2Icon");
export const Undo2 = Undo2Icon;
export const UploadIcon = create(HugeUpload04Icon, "UploadIcon");
export const Upload = UploadIcon;
export const UserPenIcon = create(HugeUserEdit01Icon, "UserPenIcon");
export const UserPen = UserPenIcon;
export const UserRoundIcon = create(HugeUserIcon, "UserRoundIcon");
export const UserRound = UserRoundIcon;
export const UserRoundCheckIcon = create(
  HugeUserCheck01Icon,
  "UserRoundCheckIcon",
);
export const UserRoundCheck = UserRoundCheckIcon;
export const UserXIcon = create(HugeUserRemove01Icon, "UserXIcon");
export const UserX = UserXIcon;
export const UsersIcon = create(HugeUserGroupIcon, "UsersIcon");
export const Users = UsersIcon;
export const XIcon = create(HugeCancel01Icon, "XIcon");
export const X = XIcon;

// Document composer
export const TextBoldIcon = create(HugeTextBoldIcon, "TextBoldIcon");
export const TextItalicIcon = create(HugeTextItalicIcon, "TextItalicIcon");
export const TextUnderlineIcon = create(
  HugeTextUnderlineIcon,
  "TextUnderlineIcon",
);
export const TextStrikethroughIcon = create(
  HugeTextStrikethroughIcon,
  "TextStrikethroughIcon",
);
export const TextSubscriptIcon = create(
  HugeTextSubscriptIcon,
  "TextSubscriptIcon",
);
export const TextSuperscriptIcon = create(
  HugeTextSuperscriptIcon,
  "TextSuperscriptIcon",
);
export const TextColorIcon = create(HugeTextColorIcon, "TextColorIcon");
export const HighlighterIcon = create(HugeHighlighterIcon, "HighlighterIcon");
export const TextClearIcon = create(HugeTextClearIcon, "TextClearIcon");
export const TextAlignLeftIcon = create(
  HugeTextAlignLeftIcon,
  "TextAlignLeftIcon",
);
export const TextAlignCenterIcon = create(
  HugeTextAlignCenterIcon,
  "TextAlignCenterIcon",
);
export const TextAlignRightIcon = create(
  HugeTextAlignRightIcon,
  "TextAlignRightIcon",
);
export const TextAlignJustifyIcon = create(
  HugeTextAlignJustifyCenterIcon,
  "TextAlignJustifyIcon",
);
export const LeftToRightListBulletIcon = create(
  HugeLeftToRightListBulletIcon,
  "LeftToRightListBulletIcon",
);
export const LeftToRightListNumberIcon = create(
  HugeLeftToRightListNumberIcon,
  "LeftToRightListNumberIcon",
);
export const CheckListIcon = create(HugeCheckListIcon, "CheckListIcon");
export const TextIndentMoreIcon = create(
  HugeTextIndentMoreIcon,
  "TextIndentMoreIcon",
);
export const TextIndentLessIcon = create(
  HugeTextIndentLessIcon,
  "TextIndentLessIcon",
);
export const LinkIcon = create(HugeLink01Icon, "LinkIcon");
export const UnlinkIcon = create(HugeUnlink01Icon, "UnlinkIcon");
export const ImageAddIcon = create(HugeImageAdd01Icon, "ImageAddIcon");
export const TableIcon = create(HugeTable01Icon, "TableIcon");
export const QuoteDownIcon = create(HugeQuoteDownIcon, "QuoteDownIcon");
export const SourceCodeIcon = create(HugeSourceCodeIcon, "SourceCodeIcon");
export const ParagraphIcon = create(HugeParagraphIcon, "ParagraphIcon");
export const FileImportIcon = create(HugeFileImportIcon, "FileImportIcon");
export const ScissorsIcon = create(HugeScissor01Icon, "ScissorsIcon");
export const ClipboardIcon = create(HugeClipboardIcon, "ClipboardIcon");
export const ClipboardPasteIcon = create(
  HugeClipboardPasteIcon,
  "ClipboardPasteIcon",
);
export const ZoomInIcon = create(HugeZoomInIcon, "ZoomInIcon");
export const ZoomOutIcon = create(HugeZoomOutIcon, "ZoomOutIcon");
export const InsertRowUpIcon = create(HugeInsertRowUpIcon, "InsertRowUpIcon");
export const InsertRowDownIcon = create(
  HugeInsertRowDownIcon,
  "InsertRowDownIcon",
);
export const InsertColumnLeftIcon = create(
  HugeInsertColumnLeftIcon,
  "InsertColumnLeftIcon",
);
export const InsertColumnRightIcon = create(
  HugeInsertColumnRightIcon,
  "InsertColumnRightIcon",
);
export const DeleteRowIcon = create(HugeDeleteRowIcon, "DeleteRowIcon");
export const DeleteColumnIcon = create(
  HugeDeleteColumnIcon,
  "DeleteColumnIcon",
);
export const PaintBrushIcon = create(HugePaintBrush01Icon, "PaintBrushIcon");
export const TextSelectionIcon = create(
  HugeTextSelectionIcon,
  "TextSelectionIcon",
);
export const MoreVerticalIcon = create(
  HugeMoreVerticalIcon,
  "MoreVerticalIcon",
);
