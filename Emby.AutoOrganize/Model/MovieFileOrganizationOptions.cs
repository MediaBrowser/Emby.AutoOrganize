
namespace Emby.AutoOrganize.Model
{
    public class MovieFileOrganizationOptions
    {
        public bool IsEnabled { get; set; }
        public int MinFileSizeMb { get; set; }
        public string[] LeftOverFileExtensionsToDelete { get; set; }
        public string[] WatchLocations { get; set; }

        public string MoviePattern { get; set; }

        public bool OverwriteExistingFiles { get; set; }

        public bool DeleteEmptyFolders { get; set; }

        public bool ExtendedClean { get; set; }

        public bool CopyOriginalFile { get; set; }

        public bool AutoDetectMovie { get; set; }

        public string DefaultMovieLibraryPath { get; set; }

        public string[] IgnoredFileNameContains {get; set;}


        public bool CreateMovieInFolder { get; set; } = true;

        public string MovieFolderPattern { get; set; }

        public MovieFileOrganizationOptions()
        {
            MinFileSizeMb = 50;

            LeftOverFileExtensionsToDelete = new string[] { };

            MoviePattern = "%fn.%ext";
            IgnoredFileNameContains = new string[] { };
            WatchLocations = new string[] { };

            CopyOriginalFile = false;

            CreateMovieInFolder = false;

            MovieFolderPattern = "%mn (%my)";

            ExtendedClean = false;
        }
    }
}
