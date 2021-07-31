using MediaBrowser.Controller.Configuration;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Logging;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Emby.AutoOrganize.Model;
using MediaBrowser.Controller.Dto;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Model.IO;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Model.Providers;
using MediaBrowser.Model.Entities;

namespace Emby.AutoOrganize.Core
{
    public class MovieFileOrganizer
    {
        private readonly ILibraryMonitor _libraryMonitor;
        private readonly ILibraryManager _libraryManager;
        private readonly ILogger _logger;
        private readonly IFileSystem _fileSystem;
        private readonly IFileOrganizationService _organizationService;
        private readonly IServerConfigurationManager _config;
        private readonly IProviderManager _providerManager;

        private readonly CultureInfo _usCulture = new CultureInfo("en-US");

        public MovieFileOrganizer(IFileOrganizationService organizationService, IServerConfigurationManager config, IFileSystem fileSystem, ILogger logger, ILibraryManager libraryManager, ILibraryMonitor libraryMonitor, IProviderManager providerManager)
        {
            _organizationService = organizationService;
            _config              = config;
            _fileSystem          = fileSystem;
            _logger              = logger;
            _libraryManager      = libraryManager;
            _libraryMonitor      = libraryMonitor;
            _providerManager     = providerManager;
        }

        private FileOrganizerType CurrentFileOrganizerType => FileOrganizerType.Movie;

        public async Task<FileOrganizationResult> OrganizeMovieFile(string path, MovieFileOrganizationOptions options, CancellationToken cancellationToken)
        {
            _logger.Info("Sorting file {0}", path);

            var result = new FileOrganizationResult
            {
                Date                = DateTime.UtcNow,
                OriginalPath        = path,
                OriginalFileName    = Path.GetFileName(path),
                ExtractedResolution = FileOrganizationHelper.GetStreamResolutionFromFileName(Path.GetFileName(path)),
                Type                = FileOrganizerType.Unknown,
                FileSize            = _fileSystem.GetFileInfo(path).Length
            };           

            if (_libraryMonitor.IsPathLocked(path.AsSpan()))
            {
                result.Status = FileSortingStatus.Waiting;
                result.StatusMessage = "Path is locked by other processes. Please try again later.";
                _logger.Info("Auto-organize Path is locked by other processes. Please try again later.");
                return result;
            }           
            

            try
            {       
                result.Status = FileSortingStatus.Processing; 

                var movieInfo = _libraryManager.IsVideoFile(path.AsSpan()) ? _libraryManager.ParseName(Path.GetFileName(path).AsSpan()) : new ItemLookupInfo();

                var movieName = movieInfo.Name;
                
                if (!string.IsNullOrEmpty(movieName))
                {
                    var movieYear = movieInfo.Year;

                    _logger.Debug("Extracted information from {0}. Movie {1}, Year {2}", path, movieName, movieYear);

                    await OrganizeMovie(path,
                        movieName,
                        movieYear,
                        FileOrganizationHelper.GetStreamResolutionFromFileName(Path.GetFileName(path)),
                        options,
                        result,
                        cancellationToken).ConfigureAwait(false);
                }
                else
                {
                    var msg = string.Format("Unable to determine movie name from {0}", path);
                    result.Status = FileSortingStatus.Failure;
                    result.StatusMessage = msg;
                    _logger.Warn(msg);
                }

                // Handle previous result
                var previousResult = _organizationService.GetResultBySourcePath(path);

                if ((previousResult != null && result.Type == FileOrganizerType.Unknown) || (previousResult?.Status == result.Status &&
                                                                                             previousResult?.StatusMessage == result.StatusMessage &&
                                                                                             result.Status != FileSortingStatus.Success))
                {
                    // Don't keep saving the same result over and over if nothing has changed
                    return previousResult;
                }
            }
            catch (IOException ex)
            {
                if (ex.Message.Contains("being used by another process"))
                {
                    var errorMsg = string.Format("Waiting to move file from {0} to {1}: {2}", result.OriginalPath, result.TargetPath, ex.Message);
                    result.Status = FileSortingStatus.Waiting;
                    result.StatusMessage = errorMsg;
                    _logger.ErrorException(errorMsg, ex);
                }
                else
                {
                    result.Status = FileSortingStatus.Failure;
                    result.StatusMessage = ex.Message;
                    _logger.ErrorException("Error organizing file", ex);
                }
            }
            catch (Exception ex)
            {
                result.Status = FileSortingStatus.Failure;
                result.StatusMessage = ex.Message;
                _logger.ErrorException("Error organizing file", ex);
            }

            _organizationService.SaveResult(result, CancellationToken.None);

            return result;
        }

        private Movie CreateNewMovie(MovieFileOrganizationRequest request, BaseItem targetFolder, FileOrganizationResult result, MovieFileOrganizationOptions options, CancellationToken cancellationToken)
        {
            // To avoid Movie duplicate by mistake (Missing SmartMatch and wrong selection in UI)
            var movie = GetMatchingMovie(request.NewMovieName, request.NewMovieYear, targetFolder, result, options);

            if (movie == null)
            {
                // We're having a new movie here
                movie = new Movie
                {
                    Name = request.NewMovieName,
                    ProductionYear = request.NewMovieYear,
                    IsInMixedFolder = !options.CreateMovieInFolder,
                    ProviderIds = request.NewMovieProviderIds,
                };

                var newPath = GetMoviePath(result.OriginalPath, movie, options);

                if (string.IsNullOrEmpty(newPath))
                {
                    var msg = string.Format("Unable to sort {0} because target path could not be determined.", result.OriginalPath);
                    throw new OrganizationException(msg);
                }

                movie.Path = Path.Combine(request.TargetFolder, newPath);
            }

            return movie;
        }

        public FileOrganizationResult OrganizeWithCorrection(MovieFileOrganizationRequest request, MovieFileOrganizationOptions options, CancellationToken cancellationToken)
        {
            var result = _organizationService.GetResult(request.ResultId);

            try
            {
                Movie movie = null;

                if (request.NewMovieProviderIds.Count > 0)
                {
                    BaseItem targetFolder = null;

                    if (!string.IsNullOrEmpty(options.DefaultMovieLibraryPath))
                    {
                        targetFolder = _libraryManager.FindByPath(options.DefaultMovieLibraryPath, true);
                    }

                    // To avoid Series duplicate by mistake (Missing SmartMatch and wrong selection in UI)
                    movie = CreateNewMovie(request, targetFolder, result, options, cancellationToken);
                }

                if (movie == null)
                {
                    // Existing movie
                    movie = (Movie)_libraryManager.GetItemById(request.MovieId);
                    var newPath = GetMoviePath(result.OriginalPath, movie, options);
                    var targetFolder = _libraryManager
                    .GetVirtualFolders()
                    .Where(i => string.Equals(i.CollectionType, CollectionType.Movies.ToString(), StringComparison.OrdinalIgnoreCase))
                    .FirstOrDefault()
                    .Locations
                    .Where(i => movie.Path.Contains(i))
                    .FirstOrDefault();
                    movie.Path = Path.Combine(targetFolder, newPath);
                }

                // We manually set the media as Movie 
                result.Type = CurrentFileOrganizerType;

                OrganizeMovie(result.OriginalPath,
                   movie,
                   options,
                   null,
                   result,
                   cancellationToken);

                _organizationService.SaveResult(result, CancellationToken.None);
            }
            catch (IOException ex)
            {
                if (ex.Message.Contains("being used by another process"))
                {
                    var errorMsg = string.Format("Waiting to move file from {0} to {1}: {2}", result.OriginalPath, result.TargetPath, ex.Message);
                    result.Status = FileSortingStatus.Waiting;
                    result.StatusMessage = errorMsg;
                    _logger.ErrorException(errorMsg, ex);
                }
                else
                {
                    result.Status = FileSortingStatus.Failure;
                    result.StatusMessage = ex.Message;
                    _logger.ErrorException("Error organizing file", ex);
                }
            }
            catch (Exception ex)
            {
                result.Status = FileSortingStatus.Failure;
                result.StatusMessage = ex.Message;
            }

            return result;
        }


        private async Task OrganizeMovie(string sourcePath,
            string movieName,
            int? movieYear,
            string resolution,
            MovieFileOrganizationOptions options,
            FileOrganizationResult result,
            CancellationToken cancellationToken)
        {
            var movie = GetMatchingMovie(movieName, movieYear, null, result, options);
            RemoteSearchResult searchResult = null;

            if (movie == null)
            {
                var autoResult = await AutoDetectMovie(movieName, movieYear, result, options, cancellationToken).ConfigureAwait(false);

                movie = autoResult?.Item1;
                searchResult = autoResult?.Item2;

                if (movie == null)
                {
                    var msg = string.Format("Unable to find movie in library matching name {0}", movieName);
                    result.Status = FileSortingStatus.Failure;
                    result.StatusMessage = msg;
                    _logger.Warn(msg);
                    return;
                }
            }

            // We detected an Movie (either auto-detect or in library)
            // We have all the chance that the media type is an Movie
            result.Type = CurrentFileOrganizerType;

            OrganizeMovie(sourcePath,
               movie,
               options,
               searchResult,
               result,
               cancellationToken);
        }

        private void OrganizeMovie(string sourcePath,
            Movie movie,
            MovieFileOrganizationOptions options,
            RemoteSearchResult remoteResult,
            FileOrganizationResult result,
            CancellationToken cancellationToken)
        {
            OrganizeMovie(sourcePath,
               movie,
               options,
               result,
               cancellationToken);
        }

        private void OrganizeMovie(string sourcePath,
            Movie movie,
            MovieFileOrganizationOptions options,
            FileOrganizationResult result,
            CancellationToken cancellationToken)
        {
            

            bool isNew = string.IsNullOrWhiteSpace(result.Id);

            if (isNew)
            {
                _organizationService.SaveResult(result, cancellationToken);
            }

            if (!_organizationService.AddToInProgressList(result, isNew))
            {
                throw new OrganizationException("File is currently processed otherwise. Please try again later.");
            }

            try
            {
                // Proceed to sort the file                
               _logger.Info("Sorting file {0} into movie {1}", sourcePath, movie.Path);
                result.TargetPath = movie.Path;
                result.ExtractedResolution = FileOrganizationHelper.GetStreamResolutionFromFileName(sourcePath);

                var fileExists = _fileSystem.FileExists(result.TargetPath);

                if (!options.OverwriteExistingFiles)
                {
                    if (options.CopyOriginalFile && fileExists && IsSameMovie(sourcePath,  movie.Path))
                    {
                        var msg = string.Format("File '{0}' already copied to new path '{1}', stopping organization", sourcePath,  movie.Path);
                        _logger.Info(msg);
                        result.Status = FileSortingStatus.SkippedExisting;
                        result.StatusMessage = msg;
                        return;
                    }

                    if (fileExists)
                    {
                        var msg = string.Empty;
                        //The resolution of the current source movie, and the current library item are the same - mark as existing
                        if (!IsNewStreamResolution(movie, result.ExtractedResolution))
                        {
                            msg = string.Format("File '{0}' already exists as '{1}', stopping organization", sourcePath,  movie.Path);
                            _logger.Info(msg);
                            result.Status = FileSortingStatus.SkippedExisting;
                            result.StatusMessage = msg;
                            result.TargetPath = movie.Path;
                            return;
                        }
                        else //The movie exists in the library, but the new source version has a different resolution
                        {
                            msg = $"The library currently contains the movie {movie.Name}, but it has a different resolution than the current source file.";
                            _logger.Info(msg);
                            result.Status = FileSortingStatus.NewResolution; 
                            result.StatusMessage = msg;
                            result.TargetPath = string.Empty;
                            return;
                        }
                    }
                }

                PerformFileSorting(options, result);
            }
            catch (OrganizationException ex)
            {
                result.Status = FileSortingStatus.Failure;
                result.StatusMessage = ex.Message;
            }
            catch (IOException ex)
            {
                if(ex.Message.Contains("being used by another process"))
                {                    
                    var errorMsg = string.Format("Waiting to move file from {0} to {1}: {2}", result.OriginalPath, result.TargetPath, ex.Message);
                    result.Status = FileSortingStatus.Waiting;
                    result.StatusMessage = errorMsg;
                    _logger.ErrorException(errorMsg, ex);
                    
                    return;
                }
            }
            catch (Exception ex)
            {
                result.Status = FileSortingStatus.Failure;
                result.StatusMessage = ex.Message;
                _logger.Warn(ex.Message);
            }

            finally
            {
                _organizationService.RemoveFromInprogressList(result);
            }
        }

        private void PerformFileSorting(MovieFileOrganizationOptions options, FileOrganizationResult result)
        {
            // We should probably handle this earlier so that we never even make it this far
            if (string.Equals(result.OriginalPath, result.TargetPath, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            _libraryMonitor.ReportFileSystemChangeBeginning(result.TargetPath);

            _fileSystem.CreateDirectory(_fileSystem.GetDirectoryName(result.TargetPath));

            var targetAlreadyExists = _fileSystem.FileExists(result.TargetPath);

            try
            {
                if (targetAlreadyExists || options.CopyOriginalFile)
                {
                    _fileSystem.CopyFile(result.OriginalPath, result.TargetPath, true);
                }
                else
                {
                    _fileSystem.MoveFile(result.OriginalPath, result.TargetPath);
                }

                result.Status = FileSortingStatus.Success;
                result.StatusMessage = string.Empty;
            }
            catch (IOException ex)
            {
                if(ex.Message.Contains("being used by another process"))
                {                    
                    var errorMsg = string.Format("Waiting to move file from {0} to {1}: {2}", result.OriginalPath, result.TargetPath, ex.Message);
                    result.Status = FileSortingStatus.Waiting;
                    result.StatusMessage = errorMsg;
                    _logger.ErrorException(errorMsg, ex);
                    
                    return;
                }
            }
            catch (Exception ex)
            {
                var errorMsg = string.Format("Failed to move file from {0} to {1}: {2}", result.OriginalPath, result.TargetPath, ex.Message);

                result.Status = FileSortingStatus.Failure;
                result.StatusMessage = errorMsg;
                _logger.ErrorException(errorMsg, ex);

                return;
            }
            finally
            {
                _libraryMonitor.ReportFileSystemChangeComplete(result.TargetPath, true);
            }

            if (targetAlreadyExists && !options.CopyOriginalFile)
            {
                try
                {
                    _fileSystem.DeleteFile(result.OriginalPath);
                }
                catch (Exception ex)
                {
                    _logger.ErrorException("Error deleting {0}", ex, result.OriginalPath);
                }
            }
        }

        private async Task<Tuple<Movie, RemoteSearchResult>> AutoDetectMovie(string movieName, int? movieYear, FileOrganizationResult result, MovieFileOrganizationOptions options, CancellationToken cancellationToken)
        {
            if (options.AutoDetectMovie)
            {
                var parsedName = _libraryManager.ParseName(movieName.AsSpan());

                var yearInName = parsedName.Year;
                var nameWithoutYear = parsedName.Name;

                if (string.IsNullOrWhiteSpace(nameWithoutYear))
                {
                    nameWithoutYear = movieName;
                }

                if (!yearInName.HasValue)
                {
                    yearInName = movieYear;
                }

                string metadataLanguage = null;
                string metadataCountryCode = null;
                BaseItem targetFolder = null;

                if (!string.IsNullOrEmpty(options.DefaultMovieLibraryPath))
                {
                    targetFolder = _libraryManager.FindByPath(options.DefaultMovieLibraryPath, true);
                }

                if (targetFolder != null)
                {
                    metadataLanguage = targetFolder.GetPreferredMetadataLanguage();
                    metadataCountryCode = targetFolder.GetPreferredMetadataCountryCode();
                }

                var movieInfo = new MovieInfo
                {
                    Name = nameWithoutYear,
                    Year = yearInName,
                    MetadataCountryCode = metadataCountryCode,
                    MetadataLanguage = metadataLanguage
                };

                var searchResultsTask = await _providerManager.GetRemoteSearchResults<Movie, MovieInfo>(new RemoteSearchQuery<MovieInfo>
                {
                    SearchInfo = movieInfo

                }, targetFolder, cancellationToken);

                var finalResult = searchResultsTask.FirstOrDefault();

                if (finalResult != null)
                {
                    // We are in the good position, we can create the item
                    var organizationRequest = new MovieFileOrganizationRequest
                    {
                        NewMovieName = finalResult.Name,
                        NewMovieProviderIds = finalResult.ProviderIds,
                        NewMovieYear = finalResult.ProductionYear,
                        TargetFolder = options.DefaultMovieLibraryPath
                    };

                    var movie = CreateNewMovie(organizationRequest, targetFolder, result, options, cancellationToken);

                    return new Tuple<Movie, RemoteSearchResult>(movie, finalResult);
                }
            }

            return null;
        }


        private Movie GetMatchingMovie(string movieName, int? movieYear, BaseItem targetFolder, FileOrganizationResult result, MovieFileOrganizationOptions options)
        {
            var parsedName = _libraryManager.ParseName(movieName.AsSpan());
            
            var yearInName = parsedName.Year;
            var nameWithoutYear = parsedName.Name;

            if (string.IsNullOrWhiteSpace(nameWithoutYear))
            {
                nameWithoutYear = movieName;
            }

            if (!yearInName.HasValue)
            {
                yearInName = movieYear;
            }

            result.ExtractedName = nameWithoutYear;
            result.ExtractedYear = yearInName;
            result.ExtractedResolution = FileOrganizationHelper.GetStreamResolutionFromFileName(movieName);

            var movie = _libraryManager.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { typeof(Movie).Name },
                Recursive = true,
                DtoOptions = new DtoOptions(true),
                AncestorIds = targetFolder == null ? Array.Empty<long>() : new[] { targetFolder.InternalId },
                SearchTerm = nameWithoutYear,
                Years = yearInName.HasValue ? new[] { yearInName.Value } : Array.Empty<int>()
            })
                .Cast<Movie>()
                // Check For the right extension (to handle quality upgrade)
                .FirstOrDefault(m => Path.GetExtension(m.Path) == Path.GetExtension(result.OriginalPath));

            return movie;
        }

        /// <summary>
        /// Gets the new path.
        /// </summary>
        /// <param name="sourcePath">The source path.</param>
        /// <param name="movie">The movie.</param>
        /// <param name="options">The options.</param>
        /// <returns>System.String.</returns>
        private string GetMoviePath(string sourcePath,
            Movie movie,
            MovieFileOrganizationOptions options)
        {
            var movieFileName = "";

            if (options.CreateMovieInFolder)
            {
                movieFileName = Path.Combine(movieFileName, GetMovieFolder(sourcePath, movie, options));
            }

            movieFileName = Path.Combine(movieFileName, GetMovieFileName(sourcePath, movie, options));

            if (string.IsNullOrEmpty(movieFileName))
            {
                // cause failure
                return string.Empty;
            }

            return movieFileName;
        }

        private string GetMovieFileName(string sourcePath, Movie movie, MovieFileOrganizationOptions options)
        {
            return GetMovieNameInternal(sourcePath, movie, options.MoviePattern);
        }

        private string GetMovieFolder(string sourcePath, Movie movie, MovieFileOrganizationOptions options)
        {
            return GetMovieNameInternal(sourcePath, movie, options.MovieFolderPattern);
        }

        private string GetMovieNameInternal(string sourcePath, Movie movie, string pattern)
        {
            var movieName = _fileSystem.GetValidFilename(movie.Name).Trim();
            var productionYear = movie.ProductionYear;

            var sourceExtension = (Path.GetExtension(sourcePath) ?? string.Empty).TrimStart('.');

            if (string.IsNullOrWhiteSpace(pattern))
            {
                throw new OrganizationException("GetMovieFolder: Configured movie name pattern is empty!");
            }

            var result = pattern.Replace("%mn", movieName)
                .Replace("%m.n", movieName.Replace(" ", "."))
                .Replace("%m_n", movieName.Replace(" ", "_"))
                .Replace("%my", productionYear.ToString())
                .Replace("%res", FileOrganizationHelper.GetStreamResolutionFromFileName(Path.GetFileName(sourcePath)))
                .Replace("%ext", sourceExtension)
                .Replace("%fn", Path.GetFileNameWithoutExtension(sourcePath));

            // Finally, call GetValidFilename again in case user customized the movie expression with any invalid filename characters
            return _fileSystem.GetValidFilename(result).Trim();
        }

        private bool IsSameMovie(string sourcePath, string newPath)
        {
            try
            {
                var sourceFileInfo = _fileSystem.GetFileInfo(sourcePath);
                var destinationFileInfo = _fileSystem.GetFileInfo(newPath);
                   
                if (sourceFileInfo.Length == destinationFileInfo.Length && sourceFileInfo.Extension == destinationFileInfo.Extension)
                {
                    return true;
                }
            }
            catch (FileNotFoundException)
            {
                return false;
            }
            catch (IOException)
            {
                return false;
            }

            return false;
        }

        private bool IsNewStreamResolution(Movie movie, string extractedResolution)
        {
            //We may have a library entery for this movie, but this particular copy of it may have a different Resolution.
            try
            {                
                if (movie.GetMediaStreams().Any(s => s.DisplayTitle.Contains(extractedResolution)))
                {
                    return false;
                }
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
